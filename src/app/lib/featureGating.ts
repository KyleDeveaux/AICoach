// Feature gating utilities for subscription tiers

import type { SubscriptionTier, TierLimits, UsageTracking } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ──────────────────────────
// Tier Limits Configuration
// ──────────────────────────

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    tier: "free",
    // Metered features
    ai_photo_analyses_per_month: 0,
    ai_summaries_per_week: 0,
    ai_plan_regenerations_per_month: 0,
    ai_coach_calls_per_month: 0,
    // Boolean features
    coaching_access: false, // No coaching tab/cards
    ai_workout_generation: false, // Manual workouts only
    ai_workout_feedback: false,
    sms_checkins: false,
    ads_enabled: true,
    data_export: false,
    advanced_analytics: false,
  },
  pro: {
    tier: "pro",
    // Metered features
    ai_photo_analyses_per_month: 2, // 2 body checks per month
    ai_summaries_per_week: 1,
    ai_plan_regenerations_per_month: 2,
    ai_coach_calls_per_month: 0, // No AI coach calls
    // Boolean features
    coaching_access: true, // Full coaching access
    ai_workout_generation: true, // AI-generated workouts
    ai_workout_feedback: true,
    sms_checkins: true,
    ads_enabled: false,
    data_export: false,
    advanced_analytics: false,
  },
  elite: {
    tier: "elite",
    // Metered features
    ai_photo_analyses_per_month: -1, // Unlimited body checks
    ai_summaries_per_week: -1, // Unlimited
    ai_plan_regenerations_per_month: -1, // Unlimited
    ai_coach_calls_per_month: 2, // 2 AI coach calls per month
    // Boolean features
    coaching_access: true,
    ai_workout_generation: true,
    ai_workout_feedback: true,
    sms_checkins: true,
    ads_enabled: false,
    data_export: true,
    advanced_analytics: true,
  },
};

// ──────────────────────────
// Feature Access Helpers
// ──────────────────────────

export type BooleanFeature =
  | "coaching_access"
  | "ai_workout_generation"
  | "ai_workout_feedback"
  | "sms_checkins"
  | "ads_enabled"
  | "data_export"
  | "advanced_analytics";

export type MeteredFeature =
  | "ai_photo_analyses_per_month"
  | "ai_summaries_per_week"
  | "ai_plan_regenerations_per_month"
  | "ai_coach_calls_per_month";

/**
 * Check if a tier can access a boolean feature
 */
export function canUseFeature(
  tier: SubscriptionTier,
  feature: BooleanFeature
): boolean {
  const limits = TIER_LIMITS[tier];
  return limits[feature] === true;
}

/**
 * Check if a tier has any access to a metered feature (limit > 0 or unlimited)
 */
export function hasFeatureAccess(
  tier: SubscriptionTier,
  feature: MeteredFeature
): boolean {
  const limits = TIER_LIMITS[tier];
  const value = limits[feature];
  return value === -1 || value > 0;
}

/**
 * Get the limit for a metered feature
 * Returns -1 for unlimited, 0 for no access, positive number for limit
 */
export function getFeatureLimit(
  tier: SubscriptionTier,
  feature: MeteredFeature
): number {
  return TIER_LIMITS[tier][feature];
}

// ──────────────────────────
// Usage Checking
// ──────────────────────────

export interface UsageCheckResult {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  reason?: string;
}

/**
 * Get the start of the current billing period (first of current month)
 */
export function getCurrentPeriodStart(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
}

/**
 * Get the end of the current billing period (last day of current month)
 */
export function getCurrentPeriodEnd(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];
}

/**
 * Map feature names to usage_tracking column names
 */
const FEATURE_TO_COLUMN: Record<string, keyof UsageTracking> = {
  ai_photo_analyses: "ai_photo_analyses_used",
  ai_summaries: "ai_summaries_generated",
  ai_workout_feedback: "ai_workout_feedback_used",
  ai_plan_regenerations: "ai_plan_regenerations_used",
  ai_coach_calls: "ai_coach_calls_used",
};

export type TrackableFeature =
  | "ai_photo_analyses"
  | "ai_summaries"
  | "ai_workout_feedback"
  | "ai_plan_regenerations"
  | "ai_coach_calls";

/**
 * Check if user can use a metered feature based on their tier and current usage
 */
export async function checkUsageLimit(
  profileId: string,
  feature: TrackableFeature,
  supabase: SupabaseClient
): Promise<UsageCheckResult> {
  // Get subscription tier from profile
  const { data: profile, error: profileError } = await supabase
    .from("client_profiles")
    .select("subscription_tier")
    .eq("id", profileId)
    .single();

  if (profileError || !profile) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      reason: "Profile not found",
    };
  }

  const tier = (profile.subscription_tier as SubscriptionTier) ?? "free";
  const featureKey = `${feature}_per_month` as MeteredFeature;
  const limit = TIER_LIMITS[tier][featureKey] ?? 0;

  // Unlimited access
  if (limit === -1) {
    return {
      allowed: true,
      used: 0,
      limit: -1,
      remaining: -1,
    };
  }

  // No access at all
  if (limit === 0) {
    return {
      allowed: false,
      used: 0,
      limit: 0,
      remaining: 0,
      reason: `${feature.replace(/_/g, " ")} is not available on the ${tier} tier`,
    };
  }

  // Get current period usage
  const periodStart = getCurrentPeriodStart();
  const { data: usage } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("profile_id", profileId)
    .eq("period_start", periodStart)
    .single();

  const columnName = FEATURE_TO_COLUMN[feature];
  const used = (usage?.[columnName] as number) ?? 0;
  const remaining = Math.max(0, limit - used);

  if (used >= limit) {
    return {
      allowed: false,
      used,
      limit,
      remaining: 0,
      reason: `You've used all ${limit} ${feature.replace(/_/g, " ")} this month. Resets on the 1st.`,
    };
  }

  return {
    allowed: true,
    used,
    limit,
    remaining,
  };
}

/**
 * Increment usage counter after successful feature use
 */
export async function incrementUsage(
  profileId: string,
  feature: TrackableFeature,
  supabase: SupabaseClient
): Promise<void> {
  const periodStart = getCurrentPeriodStart();
  const periodEnd = getCurrentPeriodEnd();
  const columnName = FEATURE_TO_COLUMN[feature];

  // Try to get existing usage record
  const { data: existing } = await supabase
    .from("usage_tracking")
    .select("*")
    .eq("profile_id", profileId)
    .eq("period_start", periodStart)
    .single();

  if (existing) {
    // Update existing record
    const currentValue = (existing[columnName] as number) ?? 0;
    await supabase
      .from("usage_tracking")
      .update({
        [columnName]: currentValue + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
  } else {
    // Create new record
    await supabase.from("usage_tracking").insert({
      profile_id: profileId,
      period_start: periodStart,
      period_end: periodEnd,
      [columnName]: 1,
    });
  }
}

// ──────────────────────────
// Tier Comparison Helpers
// ──────────────────────────

/**
 * Check if tier A is higher than tier B
 */
export function isHigherTier(tierA: SubscriptionTier, tierB: SubscriptionTier): boolean {
  const order: Record<SubscriptionTier, number> = {
    free: 0,
    pro: 1,
    elite: 2,
  };
  return order[tierA] > order[tierB];
}

/**
 * Get the next tier up from the current tier
 */
export function getNextTier(currentTier: SubscriptionTier): SubscriptionTier | null {
  if (currentTier === "free") return "pro";
  if (currentTier === "pro") return "elite";
  return null;
}

/**
 * Get display name for a tier
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    free: "Free",
    pro: "Pro",
    elite: "Elite",
  };
  return names[tier];
}

/**
 * Get the recommended tier for a feature
 */
export function getRequiredTierForFeature(
  feature: BooleanFeature | MeteredFeature
): SubscriptionTier {
  // Check from lowest to highest
  for (const tier of ["free", "pro", "elite"] as SubscriptionTier[]) {
    const limits = TIER_LIMITS[tier];
    const value = limits[feature as keyof TierLimits];

    if (typeof value === "boolean" && value === true) {
      return tier;
    }
    if (typeof value === "number" && value !== 0) {
      return tier;
    }
  }

  return "elite"; // Default to elite if not found
}
