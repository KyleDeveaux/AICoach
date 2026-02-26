// Stripe webhook handler for subscription events

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe, getTierFromPriceId, getIntervalFromPriceId } from "@/app/lib/stripe";
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

  // Record event for idempotency
  await supabaseAdmin.from("stripe_events").insert({
    stripe_event_id: event.id,
    event_type: event.type,
    payload: event.data.object as Record<string, unknown>,
  });

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
  const interval = getIntervalFromPriceId(priceId);

  // Determine status
  const status = subscription.status === "trialing" ? "trialing" : "active";

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
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
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
  const interval = getIntervalFromPriceId(priceId);

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

    const { error: insertError } = await supabaseAdmin.from("subscriptions").insert({
      profile_id: profile.id,
      user_id: profile.user_id,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      tier,
      status,
      billing_interval: interval,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
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
  const { error: subError } = await supabaseAdmin
    .from("subscriptions")
    .update({
      stripe_price_id: priceId,
      tier,
      status,
      billing_interval: interval,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
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
  if (!invoice.subscription) return;

  const customerId = invoice.customer as string;
  const subscriptionId = typeof invoice.subscription === "string"
    ? invoice.subscription
    : invoice.subscription.id;

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
      const interval = getIntervalFromPriceId(priceId);
      const status = subscription.status === "trialing" ? "trialing" : "active";

      console.log(`[stripe/webhook] Creating subscription record from invoice.paid for profile ${profile.id}`);

      const { error: insertError } = await supabaseAdmin.from("subscriptions").insert({
        profile_id: profile.id,
        user_id: profile.user_id,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        tier,
        status,
        billing_interval: interval,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        trial_start: subscription.trial_start
          ? new Date(subscription.trial_start * 1000).toISOString()
          : null,
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
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

    await supabaseAdmin
      .from("subscriptions")
      .update({
        status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
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

  if (!invoice.subscription) return;

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
