"use client";

import { ReactNode } from "react";
import { useSubscription } from "../lib/useSubscription";
import { UpgradePrompt, FeatureLockOverlay } from "./UpgradePrompt";
import type { BooleanFeature, MeteredFeature } from "../lib/featureGating";

type Feature = BooleanFeature | MeteredFeature;

interface FeatureGateProps {
  /** The feature to check access for */
  feature: Feature;
  /** Content to render if user has access */
  children: ReactNode;
  /** What to show when user doesn't have access */
  fallback?: "hide" | "upgrade-card" | "upgrade-inline" | "lock-overlay" | ReactNode;
  /** Optional description for upgrade prompts */
  description?: string;
  /** If true, shows loading state while checking subscription */
  showLoading?: boolean;
}

/**
 * FeatureGate - Conditionally renders content based on subscription tier
 *
 * @example
 * // Hide content completely for free users
 * <FeatureGate feature="coaching_access" fallback="hide">
 *   <CoachingCard />
 * </FeatureGate>
 *
 * @example
 * // Show upgrade card instead
 * <FeatureGate feature="sms_checkins" fallback="upgrade-card" description="Get daily SMS check-ins">
 *   <SmsSettings />
 * </FeatureGate>
 *
 * @example
 * // Show locked overlay over content
 * <FeatureGate feature="ai_photo_analyses_per_month" fallback="lock-overlay">
 *   <BodyCheckCard />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback = "hide",
  description,
  showLoading = false,
}: FeatureGateProps) {
  const { canUse, loading } = useSubscription();

  // Show loading state if requested
  if (loading && showLoading) {
    return (
      <div className="animate-pulse rounded-2xl bg-slate-100 h-32" />
    );
  }

  // Check if user can access this feature
  const hasAccess = canUse(feature);

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - render fallback
  switch (fallback) {
    case "hide":
      return null;

    case "upgrade-card":
      return <UpgradePrompt feature={feature} description={description} variant="card" />;

    case "upgrade-inline":
      return <UpgradePrompt feature={feature} description={description} variant="inline" />;

    case "lock-overlay":
      return <FeatureLockOverlay feature={feature}>{children}</FeatureLockOverlay>;

    default:
      // Custom fallback component
      return <>{fallback}</>;
  }
}

interface FeatureGateRenderProps {
  /** The feature to check access for */
  feature: Feature;
  /** Render function that receives access status */
  children: (props: {
    hasAccess: boolean;
    loading: boolean;
    tier: string;
    used?: number;
    limit?: number;
    remaining?: number;
  }) => ReactNode;
}

/**
 * FeatureGateRender - Render props pattern for more control
 *
 * @example
 * <FeatureGateRender feature="ai_photo_analyses_per_month">
 *   {({ hasAccess, used, limit, remaining }) => (
 *     <div>
 *       {hasAccess ? (
 *         <>
 *           <BodyCheckCard />
 *           <span>{remaining} of {limit} remaining</span>
 *         </>
 *       ) : (
 *         <UpgradePrompt feature="ai_photo_analyses" />
 *       )}
 *     </div>
 *   )}
 * </FeatureGateRender>
 */
export function FeatureGateRender({ feature, children }: FeatureGateRenderProps) {
  const { canUse, getUsage, loading, tier } = useSubscription();

  const hasAccess = canUse(feature);
  const usage = getUsage(feature);

  return (
    <>
      {children({
        hasAccess,
        loading,
        tier,
        used: usage.used,
        limit: usage.limit,
        remaining: usage.remaining,
      })}
    </>
  );
}

interface RequireSubscriptionProps {
  /** Minimum tier required (defaults to "pro") */
  minTier?: "pro" | "elite";
  /** Content to render if user has required tier */
  children: ReactNode;
  /** Fallback content when tier requirement not met */
  fallback?: ReactNode;
}

/**
 * RequireSubscription - Gate content by minimum tier level
 *
 * @example
 * <RequireSubscription minTier="elite">
 *   <DataExportButton />
 * </RequireSubscription>
 */
export function RequireSubscription({
  minTier = "pro",
  children,
  fallback,
}: RequireSubscriptionProps) {
  const { tier } = useSubscription();

  const tierOrder = { free: 0, pro: 1, elite: 2 };
  const hasRequiredTier = tierOrder[tier] >= tierOrder[minTier];

  if (hasRequiredTier) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return null;
}
