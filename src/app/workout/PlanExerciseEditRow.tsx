"use client";

import type { WorkoutExercise } from "../lib/types";

type PlanExerciseEditRowProps = {
  exercise: WorkoutExercise;
  index: number;
  onUpdate: (updates: Partial<WorkoutExercise>) => void;
  onRemove: () => void;
};

export default function PlanExerciseEditRow({
  exercise,
  index,
  onUpdate,
  onRemove,
}: PlanExerciseEditRowProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-white/5 bg-slate-800/30 px-4 py-3"
      style={{ animation: `slideInX 0.3s ease-out ${index * 0.05}s both` }}
    >
      {/* Index badge */}
      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md bg-slate-800/50 text-xs font-bold text-slate-400">
        {index + 1}
      </span>

      {/* Exercise name */}
      <div className="min-w-0 flex-1">
        <input
          type="text"
          value={exercise.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full rounded-md border border-white/5 bg-slate-900/50 px-2 py-1 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20"
          placeholder="Exercise name"
        />
      </div>

      {/* Sets */}
      <input
        type="number"
        min={1}
        max={10}
        value={exercise.sets}
        onChange={(e) => {
          const val = parseInt(e.target.value, 10);
          if (!isNaN(val) && val >= 1 && val <= 10) onUpdate({ sets: val });
        }}
        className="w-14 rounded-md border border-white/5 bg-slate-900/50 px-2 py-1 text-center text-xs font-bold text-white outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20"
      />

      <span className="text-xs text-slate-500">x</span>

      {/* Reps */}
      <input
        type="text"
        value={exercise.reps}
        onChange={(e) => onUpdate({ reps: e.target.value })}
        className="w-16 rounded-md border border-white/5 bg-slate-900/50 px-2 py-1 text-center text-xs font-bold text-white outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20"
        placeholder="8-10"
      />

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
        aria-label={`Remove ${exercise.name}`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </div>
  );
}
