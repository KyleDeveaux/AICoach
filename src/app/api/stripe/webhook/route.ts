// Stripe webhook handler for subscription events

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, getTierFromPriceId } from "@/app/lib/stripe";
import type { BillingInterval } from "@/app/lib/types";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type Stripe from "stripe";

export const runtime = "nodejs";

// Disable body parsing - we need raw body for signature verification
export const dynamic = "force-dynamic";

// ──────────────────────────
// Webhook Handler
// ──────────────────────────

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    console.error("[stripe/webhook] Missing stripe-signature header");
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/webhook] Signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  // Idempotency check - prevent duplicate processing
  const { data: existingEvent } = await supabaseAdmin
    .from("stripe_events")
    .select("id")
    .eq("stripe_event_id", event.id)
    .single();

  if (existingEvent) {
    console.log(`[stripe/webhook] Event ${event.id} already processed, skipping`);
    return NextResponse.json({ received: true, skipped: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`[stripe/webhook] Unhandled event type: ${event.type}`);
    }

    // Record event AFTER successful processing so Stripe can retry on failure
    await supabaseAdmin.from("stripe_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event.data.object as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[stripe/webhook] Error handling ${event.type}:`, message);
    return NextResponse.json(
      { error: `Webhook handler failed: ${message}` },
      { status: 500 }
    );
  }
}

// ──────────────────────────
// Helpers
// ──────────────────────────

/** Safely convert a Unix timestamp (seconds) to ISO string, or return null */
function safeTimestamp(ts: unknown): string | null {
  if (typeof ts !== "number" || !isFinite(ts) || ts <= 0) return null;
  try {
    return new Date(ts * 1000).toISOString();
  } catch {
    return null;
  }
}

/** Get billing period dates from a Stripe subscription (SDK v20+ stores dates on items) */
function getSubPeriod(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  return {
    start: safeTimestamp(item?.current_period_start),
    end: safeTimestamp(item?.current_period_end),
  };
}

/** Read billing interval directly from Stripe price object (ground truth) */
function getIntervalFromStripePrice(sub: Stripe.Subscription): BillingInterval {
  const price = sub.items.data[0]?.price;
  if (price?.recurring?.interval === "year") return "year";
  return "month";
}

// ──────────────────────────
// Event Handlers
// ──────────────────────────

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[stripe/webhook] Checkout completed:", session.id);

  if (session.mode !== "subscription") {
    console.log("[stripe/webhook] Not a subscription checkout, skipping");
    return;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const profileId = session.metadata?.profile_id;
  const userId = session.metadata?.user_id;

  if (!profileId || !userId) {
    console.error("[stripe/webhook] Missing profile_id or user_id in session metadata");
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const priceId = subscription.items.data[0]?.price.id;
  const tier = getTierFromPriceId(priceId);
  const interval = getIntervalFromStripePrice(subscription);
  const period = getSubPeriod(subscription);

  // Determine status
  const status = subscription.status === "trialing" ? "trialing" : "active";

  console.log(`[stripe/webhook] Checkout details: tier=${tier}, interval=${interval}, periodEnd=${period.end}`);

  // Create or update subscription record
  await supabaseAdmin.from("subscriptions").upsert(
    {
      profile_id: profileId,
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      tier,
      status,
      billing_interval: interval,
      current_period_start: period.start,
      current_period_end: period.end,
      trial_start: safeTimestamp(subscription.trial_start),
      trial_end: safeTimestamp(subscription.trial_end),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "profile_id" }
  );

  // Sync tier to client_profiles and mark trial as used
  await supabaseAdmin
    .from("client_profiles")
    .update({
      subscription_tier: tier,
      subscription_status: status,
      stripe_customer_id: customerId,
      trial_used: true,
    })
    .eq("id", profileId);

  console.log(`[stripe/webhook] Created subscription for profile ${profileId}, tier: ${tier}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log("[stripe/webhook] Subscription updated:", subscription.id);

  const customerId = subscription.customer as string;
  const priceId = subscription.items.data[0]?.price.id;

  if (!priceId) {
    console.log("[stripe/webhook] No price ID found on subscription, skipping");
    return;
  }

  const tier = getTierFromPriceId(priceId);
  const interval = getIntervalFromStripePrice(subscription);

  // Map Stripe status to our status
  let status: string;
  switch (subscription.status) {
    case "trialing":
      status = "trialing";
      break;
    case "active":
      status = "active";
      break;
    case "past_due":
      status = "past_due";
      break;
    case "canceled":
      status = "canceled";
      break;
    case "incomplete":
    case "incomplete_expired":
      status = "incomplete";
      break;
    default:
      status = "active";
  }

  // Check if subscription record exists for this customer
  // If not, the checkout.session.completed event will handle creation
  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!existingSub) {
    // No subscription record exists - try to create one by looking up the profile
    const { data: profile } = await supabaseAdmin
      .from("client_profiles")
      .select("id, user_id")
      .eq("stripe_customer_id", customerId)
      .single();

    if (!profile) {
      console.log(`[stripe/webhook] No profile found for customer ${customerId}, cannot create subscription`);
      return;
    }

    // CREATE the subscription record (fallback for when checkout.session.completed wasn't received)
    console.log(`[stripe/webhook] Creating subscription record for profile ${profile.id}`);

    const insertPeriod = getSubPeriod(subscription);
    const { error: insertError } = await supabaseAdmin.from("subscriptions").insert({
      profile_id: profile.id,
      user_id: profile.user_id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      tier,
      status,
      billing_interval: interval,
      current_period_start: insertPeriod.start,
      current_period_end: insertPeriod.end,
      trial_start: safeTimestamp(subscription.trial_start),
      trial_end: safeTimestamp(subscription.trial_end),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (insertError) {
      console.error("[stripe/webhook] Error creating subscription:", insertError);
      return;
    }

    // Sync tier to client_profiles and mark trial as used
    await supabaseAdmin
      .from("client_profiles")
      .update({
        subscription_tier: tier,
        subscription_status: status,
        trial_used: true,
      })
      .eq("id", profile.id);

    console.log(`[stripe/webhook] Created subscription for profile ${profile.id}, tier: ${tier}, status: ${status}`);
    return;
  }

  // UPDATE existing subscription record
  const updatePeriod = getSubPeriod(subscription);
  const { error: subError } = await supabaseAdmin
    .from("subscriptions")
    .update({
      stripe_price_id: priceId,
      tier,
      status,
      billing_interval: interval,
      current_period_start: updatePeriod.start,
      current_period_end: updatePeriod.end,
      trial_end: safeTimestamp(subscription.trial_end),
      canceled_at: safeTimestamp(subscription.canceled_at),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (subError) {
    console.error("[stripe/webhook] Error updating subscription:", subError);
    return;
  }

  // Sync tier to client_profiles
  await supabaseAdmin
    .from("client_profiles")
    .update({
      subscription_tier: tier,
      subscription_status: status,
    })
    .eq("stripe_customer_id", customerId);

  console.log(`[stripe/webhook] Updated subscription for customer ${customerId}, tier: ${tier}, status: ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[stripe/webhook] Subscription deleted:", subscription.id);

  const customerId = subscription.customer as string;

  // Update subscription record
  await supabaseAdmin
    .from("subscriptions")
    .update({
      tier: "free",
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  // Revert to free tier in client_profiles
  await supabaseAdmin
    .from("client_profiles")
    .update({
      subscription_tier: "free",
      subscription_status: "canceled",
    })
    .eq("stripe_customer_id", customerId);

  console.log(`[stripe/webhook] Subscription canceled for customer ${customerId}, reverted to free tier`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  console.log("[stripe/webhook] Invoice paid:", invoice.id);

  // Only handle subscription invoices
  const subDetails = invoice.parent?.subscription_details;
  if (!subDetails?.subscription) return;

  const customerId = invoice.customer as string;
  const subscriptionId = typeof subDetails.subscription === "string"
    ? subDetails.subscription
    : subDetails.subscription.id;

  // Get the profile for this customer
  const { data: profile } = await supabaseAdmin
    .from("client_profiles")
    .select("id, user_id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) {
    console.error("[stripe/webhook] No profile found for customer:", customerId);
    return;
  }

  // Check if subscription record exists - if not, create it (fallback for missed events)
  const { data: existingSub } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!existingSub) {
    // Fetch subscription from Stripe to get full details
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = subscription.items.data[0]?.price.id;

    if (priceId) {
      const tier = getTierFromPriceId(priceId);
      const interval = getIntervalFromStripePrice(subscription);
      const status = subscription.status === "trialing" ? "trialing" : "active";
      const invPeriod = getSubPeriod(subscription);

      console.log(`[stripe/webhook] Creating subscription record from invoice.paid for profile ${profile.id}, interval=${interval}`);

      const { error: insertError } = await supabaseAdmin.from("subscriptions").insert({
        profile_id: profile.id,
        user_id: profile.user_id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        tier,
        status,
        billing_interval: interval,
        current_period_start: invPeriod.start,
        current_period_end: invPeriod.end,
        trial_start: safeTimestamp(subscription.trial_start),
        trial_end: safeTimestamp(subscription.trial_end),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (insertError) {
        console.error("[stripe/webhook] Error creating subscription from invoice.paid:", insertError);
      } else {
        // Sync tier to client_profiles and mark trial as used
        await supabaseAdmin
          .from("client_profiles")
          .update({
            subscription_tier: tier,
            subscription_status: status,
            trial_used: true,
          })
          .eq("id", profile.id);

        console.log(`[stripe/webhook] Created subscription for profile ${profile.id}, tier: ${tier}, status: ${status}`);
      }
    }
  } else {
    // Update existing subscription with current period info
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const status = subscription.status === "trialing" ? "trialing" : "active";
    const existingPeriod = getSubPeriod(subscription);

    await supabaseAdmin
      .from("subscriptions")
      .update({
        status,
        current_period_start: existingPeriod.start,
        current_period_end: existingPeriod.end,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_customer_id", customerId);

    // Sync status to client_profiles
    await supabaseAdmin
      .from("client_profiles")
      .update({ subscription_status: status })
      .eq("id", profile.id);
  }

  // Reset usage tracking for the new billing period
  const periodStart = new Date(invoice.period_start * 1000).toISOString().split("T")[0];
  const periodEnd = new Date(invoice.period_end * 1000).toISOString().split("T")[0];

  await supabaseAdmin.from("usage_tracking").upsert(
    {
      profile_id: profile.id,
      period_start: periodStart,
      period_end: periodEnd,
      ai_photo_analyses_used: 0,
      ai_summaries_generated: 0,
      ai_workout_feedback_used: 0,
      ai_plan_regenerations_used: 0,
    },
    { onConflict: "profile_id,period_start" }
  );

  console.log(`[stripe/webhook] Reset usage for profile ${profile.id} for period ${periodStart} to ${periodEnd}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[stripe/webhook] Payment failed:", invoice.id);

  if (!invoice.parent?.subscription_details?.subscription) return;

  const customerId = invoice.customer as string;

  // Update subscription status to past_due
  await supabaseAdmin
    .from("subscriptions")
    .update({
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  // Update client_profiles
  await supabaseAdmin
    .from("client_profiles")
    .update({
      subscription_status: "past_due",
    })
    .eq("stripe_customer_id", customerId);

  console.log(`[stripe/webhook] Payment failed for customer ${customerId}, status set to past_due`);
}
