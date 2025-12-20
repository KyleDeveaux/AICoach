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
};

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
}: WeeklyReviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-lg">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
          Weekly review required
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">
          Let&apos;s wrap up last week before we adjust your plan.
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          This takes about a minute. I&apos;ll use your answers to update your
          calories and workouts for the new week.
        </p>

        <form className="mt-4 space-y-4" onSubmit={onSubmit}>
          <div>
            <label className="block text-xs font-medium text-slate-700">
              Current weight (lbs)
              <span className="ml-1 text-[11px] font-normal text-slate-400">
                Optional, but helps track progress
              </span>
            </label>
            <input
              type="number"
              value={weeklyWeight}
              onChange={(e) => setWeeklyWeight(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

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
              className="mt-2 w-full"
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
              placeholder="Example: Hit 3 workouts, packed lunch 4 days..."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
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
              placeholder="Example: Late work days, ate out more than expected..."
              className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {weeklyReviewError && (
            <p className="text-xs text-rose-500">{weeklyReviewError}</p>
          )}

          <div className="mt-4 flex justify-end gap-2">
            {!shouldForceWeeklyReview && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={weeklyReviewLoading}
              className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {weeklyReviewLoading ? "Submitting..." : "Submit review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
