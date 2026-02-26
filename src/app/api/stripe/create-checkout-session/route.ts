// Create Stripe Checkout session for subscription purchase

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabaseServer";
import { stripe, getPriceId } from "@/app/lib/stripe";
import type { SubscriptionTier, BillingInterval } from "@/app/lib/types";

export const runtime = "nodejs";

interface CreateCheckoutRequest {
  tier: Exclude<SubscriptionTier, "free">;
  interval: BillingInterval;
  successUrl?: string;
  cancelUrl?: string;
}

export async function POST(req: Request) {
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

    // Parse request body
    const body = (await req.json()) as CreateCheckoutRequest;
    const { tier, interval, successUrl, cancelUrl } = body;

    // Validate tier and interval
    if (!tier || !["pro", "elite"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be 'pro' or 'elite'" },
        { status: 400 }
      );
    }

    if (!interval || !["month", "year"].includes(interval)) {
      return NextResponse.json(
        { error: "Invalid interval. Must be 'month' or 'year'" },
        { status: 400 }
      );
    }

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("id, email, first_name, stripe_customer_id, trial_used")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    let customerId = profile.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email || user.email,
        name: profile.first_name || undefined,
        metadata: {
          user_id: user.id,
          profile_id: profile.id,
        },
      });
      customerId = customer.id;

      // Save Stripe customer ID to profile
      await supabase
        .from("client_profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", profile.id);
    }

    // Get the price ID
    const priceId = getPriceId(tier, interval);

    if (!priceId) {
      return NextResponse.json(
        { error: "Price not configured for this tier/interval" },
        { status: 500 }
      );
    }

    // Build checkout session parameters
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const checkoutParams: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"], // Only allow card payments (no Cash App, Klarna, etc.)
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl || `${baseUrl}/billing?success=true`,
      cancel_url: cancelUrl || `${baseUrl}/pricing?canceled=true`,
      metadata: {
        user_id: user.id,
        profile_id: profile.id,
        tier,
        interval,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          profile_id: profile.id,
        },
      },
      allow_promotion_codes: true,
    };

    // Add trial period if user hasn't used trial before
    if (!profile.trial_used) {
      checkoutParams.subscription_data = {
        ...checkoutParams.subscription_data,
        trial_period_days: 7,
      };
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create(checkoutParams);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/create-checkout-session] Error:", message);
    return NextResponse.json(
      { error: `Failed to create checkout session: ${message}` },
      { status: 500 }
    );
  }
}
