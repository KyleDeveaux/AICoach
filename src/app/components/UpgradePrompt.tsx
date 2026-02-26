"use client";

import Link from "next/link";
import { getRequiredTierForFeature, getTierDisplayName } from "../lib/featureGating";

interface UpgradePromptProps {
  feature: string;
  description?: string;
  variant?: "inline" | "card" | "modal";
  onClose?: () => void;
}

export function UpgradePrompt({
  feature,
  description,
  variant = "card",
  onClose,
}: UpgradePromptProps) {
  const requiredTier = getRequiredTierForFeature(feature as Parameters<typeof getRequiredTierForFeature>[0]);
  const tierName = getTierDisplayName(requiredTier);

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 text-sm">
        <svg
          className="h-4 w-4 text-purple-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <span className="text-slate-600">
          {tierName} feature.{" "}
          <Link href="/pricing" className="text-purple-600 hover:underline font-medium">
            Upgrade
          </Link>
        </span>
      </div>
    );
  }

  if (variant === "modal") {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}

          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-blue-100 mb-4">
            <svg
              className="h-6 w-6 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>

          <h3 className="text-lg font-bold text-slate-900">
            Unlock {feature.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            {description ||
              `This feature is available on the ${tierName} plan. Upgrade to unlock AI-powered coaching features.`}
          </p>

          <div className="mt-6 flex gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Maybe Later
              </button>
            )}
            <Link
              href="/pricing"
              className="flex-1 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:shadow-lg transition"
            >
              View Plans
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Default: card variant
  return (
    <div className="rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500">
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-slate-900">
            Unlock {feature.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {description ||
              `This feature is available on the ${tierName} plan. Upgrade to get personalized AI coaching.`}
          </p>

          <div className="mt-4 flex items-center gap-4">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg transition"
            >
              Upgrade to {tierName}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
            <Link href="/pricing" className="text-sm text-purple-600 hover:underline font-medium">
              Compare plans
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Usage Limit Warning Component
export function UsageLimitWarning({
  feature,
  used,
  limit,
}: {
  feature: string;
  used: number;
  limit: number;
}) {
  const remaining = limit - used;
  const percentage = (used / limit) * 100;

  if (remaining > 1) return null;

  return (
    <div
      className={[
        "rounded-lg px-4 py-3 text-sm flex items-center gap-3",
        remaining === 0
          ? "bg-red-50 border border-red-200 text-red-700"
          : "bg-amber-50 border border-amber-200 text-amber-700",
      ].join(" ")}
    >
      <svg
        className={["h-5 w-5", remaining === 0 ? "text-red-500" : "text-amber-500"].join(" ")}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <span>
        {remaining === 0 ? (
          <>
            You've used all {limit} {feature.replace(/_/g, " ")} this month.{" "}
            <Link href="/pricing" className="underline font-medium">
              Upgrade for more
            </Link>
          </>
        ) : (
          <>
            Only {remaining} {feature.replace(/_/g, " ")} remaining this month.
          </>
        )}
      </span>
    </div>
  );
}

// Feature Lock Overlay Component
export function FeatureLockOverlay({
  feature,
  children,
}: {
  feature: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-50 blur-sm">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-2xl">
        <div className="text-center px-6">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
            <svg
              className="h-6 w-6 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <p className="text-sm text-slate-600 mb-3">
            {feature.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} is a Pro feature
          </p>
          <Link
            href="/pricing"
            className="inline-block rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    </div>
  );
}
