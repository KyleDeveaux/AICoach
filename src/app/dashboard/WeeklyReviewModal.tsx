// app/dashboard/WeeklyReviewModal.tsx
"use client";

import { FormEvent } from "react";

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
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/5 bg-slate-900 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="border-b border-white/5 bg-amber-500/10 p-7">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
              {isEmptyWeekReview ? "Fresh start check-in" : "Weekly review required"}
            </p>
          </div>

          <h2 className="mt-3 text-2xl font-bold text-white">
            {isEmptyWeekReview
              ? "Let's start fresh this week"
              : "Time to wrap up last week"}
          </h2>

          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-400">
            {isEmptyWeekReview
              ? "Life happens! Log your current weight and we'll reset for a fresh start this week."
              : "Quick review — I'll use your answers to update your calories and workouts for the new week."}
          </p>
        </div>

        <form className="space-y-5 p-6" onSubmit={onSubmit}>
          {/* Weight field */}
          <div>
            <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              Current weight (lbs)
              <span className="ml-auto text-[10px] font-normal normal-case tracking-normal text-slate-600">
                Optional, but helps track progress
              </span>
            </label>
            <input
              type="number"
              value={weeklyWeight}
              onChange={(e) => setWeeklyWeight(e.target.value)}
              disabled={weeklyReviewLoading}
              placeholder="e.g. 185"
              className="w-full rounded-lg border border-white/5 bg-slate-800/50 px-4 py-3 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          {/* Deep questions (only if NOT empty week) */}
          {!isEmptyWeekReview && (
            <>
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-5">
                <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  How hard did this week feel overall?
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={weeklyEffort}
                  onChange={(e) => setWeeklyEffort(Number(e.target.value))}
                  disabled={weeklyReviewLoading}
                  className="w-full accent-purple-500 disabled:cursor-not-allowed disabled:opacity-70"
                />
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs font-medium text-purple-400">Easy</span>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-800/50 px-4 py-2">
                    <span className="text-lg font-bold text-purple-300">{weeklyEffort}</span>
                    <span className="text-xs font-medium text-purple-400">/ 10</span>
                  </div>
                  <span className="text-xs font-medium text-purple-400">Very Hard</span>
                </div>
              </div>

              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  What went well this week?
                </label>
                <textarea
                  rows={4}
                  value={weeklyWentWell}
                  onChange={(e) => setWeeklyWentWell(e.target.value)}
                  disabled={weeklyReviewLoading}
                  placeholder="Example: Hit 3 workouts, packed lunch 4 days..."
                  className="w-full rounded-lg border border-white/5 bg-slate-800/50 px-4 py-3 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>

              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <svg className="h-4 w-4 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  What got in the way?
                </label>
                <textarea
                  rows={4}
                  value={weeklyGotInTheWay}
                  onChange={(e) => setWeeklyGotInTheWay(e.target.value)}
                  disabled={weeklyReviewLoading}
                  placeholder="Example: Late work days, ate out more than expected..."
                  className="w-full rounded-lg border border-white/5 bg-slate-800/50 px-4 py-3 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
            </>
          )}
        </form>

        {weeklyReviewError && (
          <div className="border-t border-white/5 bg-rose-500/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-rose-600">
                <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-xs font-medium text-rose-300">{weeklyReviewError}</p>
            </div>
          </div>
        )}

        {weeklyReviewLoading && (
          <div className="border-t border-white/5 bg-cyan-500/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
              <p className="text-xs font-medium text-blue-300">
                Analyzing your week and updating your plan…
              </p>
            </div>
          </div>
        )}
        {/* Actions */}
        <div className="flex gap-3 border-t border-white/5 p-6">
          {!shouldForceWeeklyReview && (
            <button
              type="button"
              onClick={() => {
                if (!weeklyReviewLoading) onClose();
              }}
              disabled={!canClose}
              className="flex-1 rounded-lg border border-white/5 bg-slate-800/50 px-5 py-3 text-sm font-bold text-slate-400 transition-all duration-200 hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            form="weekly-review-form"
            disabled={weeklyReviewLoading}
            aria-busy={weeklyReviewLoading}
            className={[
              "rounded-lg bg-amber-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50",
              !shouldForceWeeklyReview ? "flex-[2]" : "flex-1",
            ].join(" ")}
            onClick={(e) => {
              e.preventDefault();
              const form = document.querySelector("form");
              if (form) {
                const submitEvent = new Event("submit", {
                  bubbles: true,
                  cancelable: true,
                });
                form.dispatchEvent(submitEvent);
              }
            }}
          >
            <span className="inline-flex items-center justify-center gap-2">
              {weeklyReviewLoading && (
                <Spinner size={16} className="text-white" />
              )}
              {primaryLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
