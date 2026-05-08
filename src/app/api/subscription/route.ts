// Get current user's subscription details with usage

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabaseServer";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { stripe, getTierFromPriceId } from "@/app/lib/stripe";
import { TIER_LIMITS, getCurrentPeriodStart } from "@/app/lib/featureGating";
import type {
  SubscriptionTier,
  SubscriptionStatus,
  BillingInterval,
  SubscriptionWithUsage,
} from "@/app/lib/types";

export const runtime = "nodejs";

/** Safely convert a Unix timestamp (seconds) to ISO string, or return null */
function safeTimestamp(ts: unknown): string | null {
  if (typeof ts !== "number" || !isFinite(ts) || ts <= 0) return null;
  try {
    return new Date(ts * 1000).toISOString();
  } catch {
    return null;
  }
}

/** Read billing interval directly from Stripe price object (ground truth) */
function getIntervalFromStripePrice(
  price: { recurring?: { interval?: string } | null } | null | undefined
): BillingInterval {
  const interval = price?.recurring?.interval;
  if (interval === "year") return "year";
  return "month";
}

export async function GET() {
  try {
    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's profile (include stripe_customer_id for Stripe lookup)
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select(
        "id, subscription_tier, subscription_status, trial_used, stripe_customer_id"
      )
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    let tier = (profile.subscription_tier as SubscriptionTier) || "free";

    // Get subscription details using admin client to bypass RLS
    const { data: subscriptionData, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("*")
      .eq("profile_id", profile.id)
      .single();

    if (subError && subError.code !== "PGRST116") {
      console.error("[subscription] Error fetching subscription:", subError);
    }

    let subscription = subscriptionData;

    // ── Always sync from Stripe for users with a Stripe connection ──
    // This guarantees fresh data for status, interval, and period dates.
    const hasStripeConnection =
      subscription?.stripe_subscription_id || profile.stripe_customer_id;

    // Track synced values to use directly in response (bypass stale DB data)
    let syncedStatus: SubscriptionStatus | null = null;
    let syncedInterval: BillingInterval | null = null;
    let syncedPeriodEnd: string | null = null;

    if (hasStripeConnection) {
      try {
        let stripeSub = null;

        // Try subscription ID first, then list by customer ID
        if (subscription?.stripe_subscription_id) {
          stripeSub = await stripe.subscriptions.retrieve(
            subscription.stripe_subscription_id
          );
        } else if (profile.stripe_customer_id) {
          const subs = await stripe.subscriptions.list({
            customer: profile.stripe_customer_id,
            limit: 1,
          });
          stripeSub = subs.data[0] || null;
        }

        if (stripeSub) {
          // Map Stripe status
          switch (stripeSub.status) {
            case "trialing":
              syncedStatus = "trialing";
              break;
            case "active":
              syncedStatus = "active";
              break;
            case "past_due":
              syncedStatus = "past_due";
              break;
            case "canceled":
              syncedStatus = "canceled";
              break;
            case "incomplete":
            case "incomplete_expired":
              syncedStatus = "incomplete";
              break;
            default:
              syncedStatus = "active";
          }

          // Read from SubscriptionItem (Stripe SDK v20+)
          const stripeItem = stripeSub.items.data[0];
          const priceId = stripeItem?.price?.id || null;
          const syncedTier = priceId
            ? getTierFromPriceId(priceId)
            : tier;

          // Read interval directly from Stripe price object (ground truth)
          // This bypasses getIntervalFromPriceId which relies on env var comparison
          syncedInterval = getIntervalFromStripePrice(stripeItem?.price);

          // Safely read period dates with null checks
          const syncedPeriodStart = safeTimestamp(
            stripeItem?.current_period_start
          );
          syncedPeriodEnd = safeTimestamp(stripeItem?.current_period_end);

          console.log(
            `[subscription] Stripe data: status=${syncedStatus}, tier=${syncedTier}, interval=${syncedInterval}, periodEnd=${syncedPeriodEnd}, priceId=${priceId}`
          );

          // Update DB to stay in sync
          if (subscription) {
            await supabaseAdmin
              .from("subscriptions")
              .update({
                status: syncedStatus,
                tier: syncedTier,
                billing_interval: syncedInterval,
                current_period_start: syncedPeriodStart,
                current_period_end: syncedPeriodEnd,
                stripe_subscription_id: stripeSub.id,
                stripe_price_id: priceId || subscription.stripe_price_id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", subscription.id);
          } else {
            // INSERT new row (subscription was missing from DB)
            await supabaseAdmin.from("subscriptions").upsert(
              {
                profile_id: profile.id,
                user_id: user.id,
                stripe_customer_id:
                  (stripeSub.customer as string) ||
                  profile.stripe_customer_id,
                stripe_subscription_id: stripeSub.id,
                stripe_price_id: priceId || null,
                tier: syncedTier,
                status: syncedStatus,
                billing_interval: syncedInterval,
                current_period_start: syncedPeriodStart,
                current_period_end: syncedPeriodEnd,
                trial_start: safeTimestamp(stripeSub.trial_start),
                trial_end: safeTimestamp(stripeSub.trial_end),
                updated_at: new Date().toISOString(),
              },
              { onConflict: "profile_id" }
            );
          }

          // Sync profile tier/status
          await supabaseAdmin
            .from("client_profiles")
            .update({
              subscription_tier: syncedTier,
              subscription_status: syncedStatus,
            })
            .eq("id", profile.id);

          // Re-fetch the updated subscription row
          const { data: refreshedSub } = await supabaseAdmin
            .from("subscriptions")
            .select("*")
            .eq("profile_id", profile.id)
            .single();

          if (refreshedSub) {
            subscription = refreshedSub;
          }
          tier = syncedTier;
        }
      } catch (syncErr) {
        console.error("[subscription] Error syncing from Stripe:", syncErr);
        // Continue with DB data as fallback
      }
    }

    // Get current usage
    const periodStart = getCurrentPeriodStart();
    const { data: usage, error: usageError } = await supabaseAdmin
      .from("usage_tracking")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("period_start", periodStart)
      .single();

    if (usageError && usageError.code !== "PGRST116") {
      console.error("[subscription] Error fetching usage:", usageError);
    }

    // Calculate trial state
    let trialDaysRemaining = 0;
    let isTrialing = false;

    // Use synced status if available, otherwise fall back to DB
    const effectiveStatus =
      syncedStatus ||
      (subscription?.status as SubscriptionStatus) ||
      "active";

    if (effectiveStatus === "trialing" && subscription?.trial_end) {
      const trialEnd = new Date(subscription.trial_end);
      const now = new Date();
      if (trialEnd > now) {
        isTrialing = true;
        trialDaysRemaining = Math.max(
          0,
          Math.ceil(
            (trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          )
        );
      }
    }

    // Use Stripe-synced values first, fall back to DB values
    const effectiveInterval: BillingInterval | null =
      syncedInterval ||
      (subscription?.billing_interval as BillingInterval) ||
      null;
    const effectivePeriodEnd: string | null =
      syncedPeriodEnd || subscription?.current_period_end || null;

    // Build response
    const response: SubscriptionWithUsage = {
      subscription: subscription || null,
      usage: usage || null,
      limits: TIER_LIMITS[tier],
      tier,
      isTrialing,
      trialDaysRemaining,
      status: effectiveStatus,
      billingInterval: effectiveInterval,
      currentPeriodEnd: effectivePeriodEnd,
    };

    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[subscription] Error:", message);
    return NextResponse.json(
      { error: `Failed to get subscription: ${message}` },
      { status: 500 }
    );
  }
}
