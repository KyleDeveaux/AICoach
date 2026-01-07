// app/dashboard/WeeklyReviewModal.tsx
"use client";

import React, { FormEvent } from "react";

type WeeklyReviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  weeklyWeight: string;
  setWeeklyWeight: (value: string) => void;
  weeklyEffort: number;
  setWeeklyEffort: (value: number) => void;
  weeklyWentWell: string;
  setWeeklyWentWell: (value: string) => void;
  weeklyGotInTheWay: string;
  setWeeklyGotInTheWay: (value: string) => void;
  weeklyReviewError: string | null;
  weeklyReviewLoading: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  shouldForceWeeklyReview: boolean;
  isEmptyWeekReview: boolean;
};

function Spinner({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function WeeklyReviewModal({
  isOpen,
  onClose,
  weeklyWeight,
  setWeeklyWeight,
  weeklyEffort,
  setWeeklyEffort,
  weeklyWentWell,
  setWeeklyWentWell,
  weeklyGotInTheWay,
  setWeeklyGotInTheWay,
  weeklyReviewError,
  weeklyReviewLoading,
  onSubmit,
  shouldForceWeeklyReview,
  isEmptyWeekReview,
}: WeeklyReviewModalProps) {
  if (!isOpen) return null;

  const primaryLabel = weeklyReviewLoading
    ? isEmptyWeekReview
      ? "Starting fresh…"
      : "Submitting…"
    : isEmptyWeekReview
    ? "Start fresh for this week"
    : "Submit review";

  const canClose = !weeklyReviewLoading && !shouldForceWeeklyReview;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
          {isEmptyWeekReview ? "Fresh start check-in" : "Weekly review required"}
        </p>

        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          {isEmptyWeekReview
            ? "We didn’t see any check-ins last week — let’s reset."
            : "Let's wrap up last week before we adjust your plan."}
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          {isEmptyWeekReview
            ? "Totally okay — life happens. Log your current weight so we can anchor where you are today, then we’ll treat this as a fresh start for this week."
            : "This takes about a minute. I'll use your answers to update your calories and workouts for the new week."}
        </p>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          {/* Always show weight field in both modes */}
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Current weight (lbs)
              <span className="ml-1 text-[11px] font-normal text-slate-400">
                Optional, but really helps track progress
              </span>
            </label>
            <input
              type="number"
              value={weeklyWeight}
              onChange={(e) => setWeeklyWeight(e.target.value)}
              disabled={weeklyReviewLoading}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          {/* Only show the deeper questions if this was a week with activity */}
          {!isEmptyWeekReview && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700">
                  How hard did this week feel overall? (1–10)
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={weeklyEffort}
                  onChange={(e) => setWeeklyEffort(Number(e.target.value))}
                  disabled={weeklyReviewLoading}
                  className="mt-2 w-full disabled:cursor-not-allowed disabled:opacity-70"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Effort: {weeklyEffort}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  What went well this week?
                </label>
                <textarea
                  rows={3}
                  value={weeklyWentWell}
                  onChange={(e) => setWeeklyWentWell(e.target.value)}
                  disabled={weeklyReviewLoading}
                  placeholder="Example: Hit 3 workouts, packed lunch 4 days..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  What got in the way?
                </label>
                <textarea
                  rows={3}
                  value={weeklyGotInTheWay}
                  onChange={(e) => setWeeklyGotInTheWay(e.target.value)}
                  disabled={weeklyReviewLoading}
                  placeholder="Example: Late work days, ate out more than expected..."
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
            </>
          )}

          {weeklyReviewError && (
            <p className="text-xs text-rose-500">{weeklyReviewError}</p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            {/* If it's *forced* (Monday+), we don't let them cancel */}
            {!shouldForceWeeklyReview && (
              <button
                type="button"
                onClick={() => {
                  if (!weeklyReviewLoading) onClose();
                }}
                disabled={!canClose}
                className="rounded-full px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              disabled={weeklyReviewLoading}
              aria-busy={weeklyReviewLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {weeklyReviewLoading && (
                <Spinner size={14} className="text-white/90" />
              )}
              <span>{primaryLabel}</span>
            </button>
          </div>
        </form>

        {/* Optional tiny hint while submitting */}
        {weeklyReviewLoading && (
          <p className="mt-3 text-[11px] text-slate-500">
            Updating calories and workouts…
          </p>
        )}
      </div>
    </div>
  );
}
