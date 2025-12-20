"use client";

import React from "react";

type BackfillDay = {
  isoDate: string;
  dayName: string;
  dateLabel: string;
  isToday?: boolean;
};

type DailyCheckinModalProps = {
  isOpen: boolean;
  onClose: () => void;
  isBackfillMode: boolean;

  // Title (already computed in DashboardPage)
  title: string;

  // Backfill days: days in this week up to today
  backfillDays: BackfillDay[];

  // Which date we’re saving for
  checkinDate: string;
  setCheckinDate: (date: string) => void;

  // Main fields
  didWorkout: boolean | null;
  setDidWorkout: (value: boolean) => void;

  hitCalories: boolean | null;
  setHitCalories: (value: boolean) => void;

  workoutRating: number | null;
  setWorkoutRating: (value: number | null) => void;

  notes: string;
  setNotes: (value: string) => void;

  // Status / actions
  message: string | null;
  isLoading: boolean;
  onSave: () => void;
};

export default function DailyCheckinModal({
  isOpen,
  onClose,
  isBackfillMode,
  title,
  backfillDays,
  checkinDate,
  setCheckinDate,
  didWorkout,
  setDidWorkout,
  hitCalories,
  setHitCalories,
  workoutRating,
  setWorkoutRating,
  notes,
  setNotes,
  message,
  isLoading,
  onSave,
}: DailyCheckinModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <p className="mt-1 text-xs text-slate-500">
          {isBackfillMode
            ? "Logging a past day this week helps keep your stats accurate."
            : "This should take less than a minute. Be honest — it's here to help you, not judge you."}
        </p>

        <div className="mt-4 space-y-4 text-sm">
          {/* Backfill date picker */}
          {isBackfillMode && (
            <div>
              <p className="mb-1 text-xs font-medium text-slate-800">
                Which day are you logging?
              </p>
              <select
                value={checkinDate}
                onChange={(e) => setCheckinDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              >
                {backfillDays.map((d) => (
                  <option key={d.isoDate} value={d.isoDate}>
                    {d.dayName} – {d.dateLabel}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Did workout? */}
          <div>
            <p className="mb-1 font-medium text-slate-800">
              Did you work out this day?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDidWorkout(true)}
                className={
                  "flex-1 rounded-full border px-3 py-1.5 text-sm " +
                  (didWorkout === true
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700")
                }
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setDidWorkout(false)}
                className={
                  "flex-1 rounded-full border px-3 py-1.5 text-sm " +
                  (didWorkout === false
                    ? "border-slate-800 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700")
                }
              >
                No
              </button>
            </div>
          </div>

          {/* Hit calories? */}
          <div>
            <p className="mb-1 font-medium text-slate-800">
              Did you stay close to your calorie target this day?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setHitCalories(true)}
                className={
                  "flex-1 rounded-full border px-3 py-1.5 text-sm " +
                  (hitCalories === true
                    ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-700")
                }
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setHitCalories(false)}
                className={
                  "flex-1 rounded-full border px-3 py-1.5 text-sm " +
                  (hitCalories === false
                    ? "border-amber-600 bg-amber-50 text-amber-700"
                    : "border-slate-200 bg-white text-slate-700")
                }
              >
                No
              </button>
            </div>
          </div>

          {/* Workout rating (only if didWorkout === true) */}
          {didWorkout === true && (
            <div>
              <p className="mb-1 font-medium text-slate-800">
                How would you rate your workout? (1–10)
              </p>
              <input
                type="range"
                min={1}
                max={10}
                value={workoutRating ?? 7}
                onChange={(e) => setWorkoutRating(Number(e.target.value))}
                className="w-full"
              />
              <p className="mt-1 text-xs text-slate-500">
                Rating:{" "}
                <span className="font-medium">{workoutRating ?? 7}</span>
              </p>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="mb-1 font-medium text-slate-800">
              Any quick notes about this day?
            </p>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              placeholder="Example: Ate out for lunch, felt low energy at the gym..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {message && (
          <p className="mt-3 text-xs text-slate-500">{message}</p>
        )}

        {/* Actions */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={isLoading}
            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isLoading ? "Saving..." : "Save check-in"}
          </button>
        </div>
      </div>
    </div>
  );
}
