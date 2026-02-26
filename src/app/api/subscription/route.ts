// Get current user's subscription details with usage

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabaseServer";
import { TIER_LIMITS, getCurrentPeriodStart } from "@/app/lib/featureGating";
import type { SubscriptionTier, SubscriptionWithUsage } from "@/app/lib/types";

export const runtime = "nodejs";

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

    // Get user's profile
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("id, subscription_tier, subscription_status, trial_used")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    const tier = (profile.subscription_tier as SubscriptionTier) || "free";

    // Get subscription details
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("profile_id", profile.id)
      .single();

    // Get current usage
    const periodStart = getCurrentPeriodStart();
    const { data: usage } = await supabase
      .from("usage_tracking")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("period_start", periodStart)
      .single();

    // Calculate trial days remaining
    let trialDaysRemaining = 0;
    let isTrialing = false;

    if (subscription?.status === "trialing" && subscription.trial_end) {
      isTrialing = true;
      const trialEnd = new Date(subscription.trial_end);
      const now = new Date();
      trialDaysRemaining = Math.max(
        0,
        Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
    }

    const response: SubscriptionWithUsage = {
      subscription: subscription || null,
      usage: usage || null,
      limits: TIER_LIMITS[tier],
      tier,
      isTrialing,
      trialDaysRemaining,
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
