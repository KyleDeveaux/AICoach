"use client";

import { useState } from "react";

type DailyCheckinCardProps = {
  didWorkout: boolean | null;
  setDidWorkout: (value: boolean) => void;
  hitCalories: boolean | null;
  setHitCalories: (value: boolean) => void;
  caloriesExceeded: boolean;
  workoutRating: number | null;
  setWorkoutRating: (value: number | null) => void;
  notes: string;
  setNotes: (value: string) => void;
  message: string | null;
  isLoading: boolean;
  onSave: () => void;
  onBackfill: () => void;
  canBackfill: boolean;
  hasExistingCheckin: boolean;
};

export default function DailyCheckinCard({
  didWorkout,
  setDidWorkout,
  hitCalories,
  setHitCalories,
  caloriesExceeded,
  workoutRating,
  setWorkoutRating,
  notes,
  setNotes,
  message,
  isLoading,
  onSave,
  onBackfill,
  canBackfill,
  hasExistingCheckin,
}: DailyCheckinCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const isLocked = hasExistingCheckin && !isEditing;

  return (
    <div className="glass-card p-6 transition-all duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Daily Check-In</h3>
        {isLocked && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-400">
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Completed
          </span>
        )}
      </div>

      <div className="mt-5 space-y-5">
        {/* Did you workout? */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Did you workout?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => !isLoading && !isLocked && setDidWorkout(true)}
                disabled={isLoading || isLocked}
                className={[
                  "rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed",
                  didWorkout === true
                    ? "bg-cyan-500 text-white"
                    : "bg-white/10 text-slate-400 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => !isLoading && !isLocked && setDidWorkout(false)}
                disabled={isLoading || isLocked}
                className={[
                  "rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed",
                  didWorkout === false
                    ? "bg-amber-500 text-white"
                    : "bg-white/10 text-slate-400 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                No
              </button>
            </div>
          </div>
        </div>

        {/* Hit your calorie goal? */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Hit your calorie goal?</span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => !isLoading && !isLocked && !caloriesExceeded && setHitCalories(true)}
                disabled={isLoading || isLocked || caloriesExceeded}
                className={[
                  "rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70",
                  hitCalories === true
                    ? "bg-cyan-500 text-white"
                    : "bg-white/10 text-slate-400 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => !isLoading && !isLocked && setHitCalories(false)}
                disabled={isLoading || isLocked}
                className={[
                  "rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed",
                  hitCalories === false
                    ? "bg-amber-500 text-white"
                    : "bg-white/10 text-slate-400 hover:bg-white/10 hover:text-white",
                ].join(" ")}
              >
                No
              </button>
            </div>
          </div>
          {caloriesExceeded && (
            <p className="mt-2 text-xs font-medium text-amber-400/80">
              Calories exceed your target — auto-set to No.
            </p>
          )}
        </div>

        {/* Rate your day */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-400">Rate your day:</span>
            <span className="text-lg font-bold text-white">{workoutRating ?? 7}</span>
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={workoutRating ?? 7}
            onChange={(e) => setWorkoutRating(Number(e.target.value))}
            disabled={isLoading || isLocked}
            className="mt-2 w-full bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>

        {/* Notes */}
        <div>
          <textarea
            rows={2}
            disabled={isLoading || isLocked}
            className="w-full rounded-lg border border-white/[0.06] bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all duration-200 focus:border-white/20 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
            placeholder="Any notes?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* Message */}
        {message && (
          <div className="flex items-center gap-2 rounded-lg bg-cyan-500/20 px-3 py-2">
            <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs font-medium text-cyan-300">{message}</p>
          </div>
        )}

        {/* Save / Update button */}
        <button
          type="button"
          onClick={() => {
            if (isLocked) {
              setIsEditing(true);
            } else {
              onSave();
              setIsEditing(false);
            }
          }}
          disabled={isLoading}
          className="w-full rounded-lg bg-cyan-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Saving..." : isLocked ? "Update Check-In" : "Save Check-In"}
        </button>

        {/* Backfill link */}
        {canBackfill && (
          <button
            type="button"
            onClick={onBackfill}
            className="flex w-full items-center justify-center gap-2 text-xs font-medium text-slate-500 transition-colors hover:text-slate-400"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Backfill a missed day
          </button>
        )}
      </div>
    </div>
  );
}
