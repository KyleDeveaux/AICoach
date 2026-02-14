"use client";

import { useState } from "react";
import type { WorkoutLogExerciseWithSets, SetLogUpdate } from "../lib/types";
import SetInputRow from "./SetInputRow";

type ExerciseRowProps = {
  exerciseLog: WorkoutLogExerciseWithSets;
  exerciseIndex: number;
  isWorkoutActive: boolean;
  onSetUpdate: (setLogId: string, data: SetLogUpdate) => Promise<void>;
  onAddSet: (exerciseLogId: string) => Promise<void>;
  onDeleteSet: (setLogId: string) => Promise<void>;
  demoUrl: string | null;
  onOpenDemo: (exerciseName: string) => void;
};

export default function ExerciseRow({
  exerciseLog,
  exerciseIndex,
  isWorkoutActive,
  onSetUpdate,
  onAddSet,
  onDeleteSet,
  demoUrl,
  onOpenDemo,
}: ExerciseRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sets = [...(exerciseLog.exercise_set_logs ?? [])].sort(
    (a, b) => a.set_number - b.set_number
  );
  const completedSets = sets.filter((s) => s.is_completed).length;
  const totalSets = sets.length;
  const allCompleted = totalSets > 0 && completedSets === totalSets;

  return (
    <div
      className={[
        "overflow-hidden rounded-lg border transition-all duration-200",
        allCompleted
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-white/5 bg-slate-800/30",
      ].join(" ")}
      style={{
        animation: `slideInX 0.3s ease-out ${exerciseIndex * 0.05}s both`,
      }}
    >
      {/* Header (click to expand) */}
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.02]"
      >
        {/* Index */}
        <span
          className={[
            "flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-xs font-bold",
            allCompleted
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-slate-800/50 text-slate-400",
          ].join(" ")}
        >
          {exerciseIndex + 1}
        </span>

        {/* Name + badges */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold text-white">
              {exerciseLog.exercise_name}
            </p>
            {exerciseLog.is_user_added && (
              <span className="rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-bold text-purple-300">
                Custom
              </span>
            )}
            {demoUrl && (
              <span className="flex items-center gap-1 rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] font-bold text-blue-300">
                <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                </svg>
                Demo
              </span>
            )}
          </div>

          {/* Progress */}
          {totalSets > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs text-slate-500">
                {exerciseLog.planned_sets} x {exerciseLog.planned_reps}
              </span>
              <span className="text-xs text-slate-600">·</span>
              <span
                className={[
                  "text-xs font-medium",
                  allCompleted ? "text-emerald-400" : "text-slate-400",
                ].join(" ")}
              >
                {completedSets}/{totalSets} sets
              </span>
            </div>
          )}
        </div>

        {/* Completion badge + chevron */}
        <div className="flex items-center gap-2">
          {allCompleted && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500">
              <svg
                className="h-3.5 w-3.5 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          )}

          <svg
            className={[
              "h-4 w-4 text-slate-500 transition-transform duration-200",
              isExpanded ? "rotate-180" : "",
            ].join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="space-y-2 border-t border-white/5 px-4 py-3">
          {/* Coach notes */}
          {exerciseLog.notes && (
            <div className="mb-3 rounded-lg bg-slate-900/50 px-3 py-2">
              <p className="text-xs italic text-slate-400">
                {exerciseLog.notes}
              </p>
            </div>
          )}

          {/* Demo link button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDemo(exerciseLog.exercise_name);
            }}
            className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-white/5 bg-slate-900/30 px-3 py-2 text-xs font-bold text-slate-400 transition-all duration-200 hover:border-white/10 hover:bg-slate-800/50 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {demoUrl ? "Watch Demo" : "Find Demo"}
          </button>

          {/* Set header row */}
          <div className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-600">
            <span className="w-10">Set</span>
            <span className="w-14">Target</span>
            <span className="flex-1">Reps</span>
            <span className="flex-1">Weight</span>
            <span className="w-8" />
          </div>

          {/* Set rows */}
          {sets.map((setLog) => (
            <SetInputRow
              key={setLog.id}
              setLog={setLog}
              isEditable={isWorkoutActive}
              onUpdate={onSetUpdate}
              onDelete={onDeleteSet}
            />
          ))}

          {/* Add set button */}
          {isWorkoutActive && (
            <button
              type="button"
              onClick={() => onAddSet(exerciseLog.id)}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 bg-slate-800/20 px-3 py-2 text-xs font-bold text-slate-400 transition-all duration-200 hover:border-white/20 hover:bg-slate-800/40 hover:text-white"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Add Set
            </button>
          )}

          {/* Rest seconds */}
          {exerciseLog.rest_seconds != null &&
            exerciseLog.rest_seconds > 0 && (
              <p className="pt-1 text-center text-xs text-slate-600">
                Rest: {exerciseLog.rest_seconds}s between sets
              </p>
            )}
        </div>
      )}
    </div>
  );
}
