"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import { useSubscription } from "../lib/useSubscription";
import { getTierDisplayName } from "../lib/featureGating";
import { PRICING_TIERS } from "../lib/pricingData";
import DashboardNav from "../dashboard/DashboardNav";
import type { ClientProfile } from "../lib/types";

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100">
          <DashboardNav profile={null} variant="light" />
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
          </div>
        </div>
      }
    >
      <BillingPageContent />
    </Suspense>
  );
}

function BillingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const {
    subscription,
    tier,
    limits,
    isTrialing,
    trialDaysRemaining,
    getUsage,
    openPortal,
    loading: subscriptionLoading,
  } = useSubscription();

  // Check for success message from checkout
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setShowSuccessMessage(true);
      // Clear the URL param
      window.history.replaceState({}, "", "/billing");
    }
  }, [searchParams]);

  // Load profile
  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      setProfile(data);
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  // Handle portal open
  async function handleOpenPortal() {
    try {
      setPortalLoading(true);
      await openPortal();
    } catch (err) {
      console.error("Portal error:", err);
    } finally {
      setPortalLoading(false);
    }
  }

  // Get current tier pricing info
  const currentTierInfo = PRICING_TIERS.find((t) => t.id === tier);

  // Format date
  function formatDate(dateString: string | null): string {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  if (loading || subscriptionLoading) {
    return (
      <div className="min-h-screen bg-slate-100">
        <DashboardNav profile={null} variant="light" />
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin h-8 w-8 border-4 border-purple-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <DashboardNav profile={profile} variant="light" />

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="mb-6 rounded-xl bg-green-50 border border-green-200 p-4 flex items-start gap-3">
            <svg className="h-5 w-5 text-green-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <div>
              <h3 className="font-semibold text-green-900">Welcome to {getTierDisplayName(tier)}!</h3>
              <p className="text-sm text-green-700 mt-1">
                Your subscription is now active. Enjoy all your new features!
              </p>
            </div>
            <button
              onClick={() => setShowSuccessMessage(false)}
              className="ml-auto text-green-500 hover:text-green-700"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Subscription & Billing</h1>
          <p className="text-slate-500 mt-1">Manage your subscription and view usage</p>
        </div>

        {/* Current Plan Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
                <span
                  className={[
                    "px-3 py-1 rounded-full text-xs font-bold",
                    tier === "elite"
                      ? "bg-gradient-to-r from-purple-500 to-blue-500 text-white"
                      : tier === "pro"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-slate-100 text-slate-600",
                  ].join(" ")}
                >
                  {getTierDisplayName(tier)}
                </span>
                {isTrialing && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                    Trial - {trialDaysRemaining} days left
                  </span>
                )}
              </div>
              <p className="text-slate-500 mt-2">{currentTierInfo?.description}</p>
            </div>

            {tier === "free" ? (
              <Link
                href="/pricing"
                className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg transition"
              >
                Upgrade
              </Link>
            ) : (
              <button
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition disabled:opacity-50"
              >
                {portalLoading ? "Loading..." : "Manage Subscription"}
              </button>
            )}
          </div>

          {/* Subscription Details */}
          {subscription && tier !== "free" && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Status</p>
                  <p className="mt-1 font-medium text-slate-900 capitalize">
                    {subscription.status === "active" && !isTrialing
                      ? "Active"
                      : isTrialing
                      ? "Trial"
                      : subscription.status}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Billing</p>
                  <p className="mt-1 font-medium text-slate-900 capitalize">
                    {subscription.billingInterval === "year" ? "Annual" : "Monthly"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">
                    {isTrialing ? "Trial Ends" : "Next Billing"}
                  </p>
                  <p className="mt-1 font-medium text-slate-900">
                    {isTrialing
                      ? formatDate(subscription.subscription?.trial_end || null)
                      : formatDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide">Amount</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {subscription.billingInterval === "year"
                      ? `$${currentTierInfo?.annualPrice}/year`
                      : `$${currentTierInfo?.monthlyPrice}/month`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Usage Card - Only for paid tiers */}
        {tier !== "free" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Usage This Month</h2>

            <div className="space-y-6">
              {/* AI Photo Analysis */}
              <UsageMeter
                label="AI Photo Analysis"
                usage={getUsage("ai_photo_analyses")}
                color="purple"
              />

              {/* AI Summaries */}
              <UsageMeter
                label="Weekly AI Summaries"
                usage={getUsage("ai_summaries")}
                color="blue"
              />

              {/* AI Plan Regenerations */}
              <UsageMeter
                label="AI Plan Regenerations"
                usage={getUsage("ai_plan_regenerations")}
                color="cyan"
              />
            </div>

            {tier === "pro" && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Need more? <Link href="/pricing" className="text-purple-600 hover:underline font-medium">Upgrade to Elite</Link> for unlimited AI features.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Features Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Your Features</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FeatureItem label="Custom Workout Builder" enabled={true} />
            <FeatureItem label="Unlimited Workout Logging" enabled={true} />
            <FeatureItem label="Full Progress History" enabled={true} />
            <FeatureItem label="Weight Tracking" enabled={true} />
            <FeatureItem label="SMS Check-ins" enabled={limits.sms_checkins} />
            <FeatureItem label="AI Photo Analysis" enabled={limits.ai_photo_analyses_per_month !== 0} />
            <FeatureItem label="Weekly AI Summaries" enabled={limits.ai_summaries_per_week !== 0} />
            <FeatureItem label="AI Workout Feedback" enabled={limits.ai_workout_feedback} />
            <FeatureItem label="Advanced Analytics" enabled={limits.advanced_analytics} />
            <FeatureItem label="Data Export" enabled={limits.data_export} />
            <FeatureItem label="Ad-Free Experience" enabled={!limits.ads_enabled} />
          </div>

          {tier === "free" && (
            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
                <h3 className="font-semibold text-slate-900">Unlock AI Coaching</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Upgrade to Pro for personalized AI coaching, SMS check-ins, and more.
                </p>
                <Link
                  href="/pricing"
                  className="inline-block mt-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  View Plans
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Help Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Need Help?</h2>
          <p className="text-slate-500 text-sm">
            Have questions about your subscription or need assistance? Contact us at{" "}
            <a href="mailto:support@motivo.ai" className="text-purple-600 hover:underline">
              support@motivo.ai
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

// Usage Meter Component
function UsageMeter({
  label,
  usage,
  color,
}: {
  label: string;
  usage: { used: number; limit: number; remaining: number };
  color: "purple" | "blue" | "cyan";
}) {
  const isUnlimited = usage.limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, (usage.used / usage.limit) * 100);

  const colors = {
    purple: "bg-purple-500",
    blue: "bg-blue-500",
    cyan: "bg-cyan-500",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{label}</span>
        <span className="text-sm text-slate-500">
          {isUnlimited ? (
            <span className="text-green-600 font-medium">Unlimited</span>
          ) : (
            <>
              {usage.used} / {usage.limit} used
            </>
          )}
        </span>
      </div>
      {!isUnlimited && (
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${colors[color]} rounded-full transition-all duration-300`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Feature Item Component
function FeatureItem({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {enabled ? (
        <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      <span className={enabled ? "text-slate-700" : "text-slate-400"}>{label}</span>
    </div>
  );
}
