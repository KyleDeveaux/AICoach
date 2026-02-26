"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ExerciseSetLogRow, SetLogUpdate } from "../lib/types";

type SetInputRowProps = {
  setLog: ExerciseSetLogRow;
  isEditable: boolean;
  onUpdate: (setLogId: string, data: SetLogUpdate) => Promise<void>;
  onDelete: (setLogId: string) => Promise<void>;
};

export default function SetInputRow({
  setLog,
  isEditable,
  onUpdate,
  onDelete,
}: SetInputRowProps) {
  const [reps, setReps] = useState(
    setLog.reps_completed != null ? String(setLog.reps_completed) : ""
  );
  const [weight, setWeight] = useState(
    setLog.weight_value != null ? String(setLog.weight_value) : ""
  );
  const [completed, setCompleted] = useState(setLog.is_completed);

  // Debounce timer ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync from parent when setLog changes (e.g. after refetch)
  useEffect(() => {
    setReps(
      setLog.reps_completed != null ? String(setLog.reps_completed) : ""
    );
    setWeight(
      setLog.weight_value != null ? String(setLog.weight_value) : ""
    );
    setCompleted(setLog.is_completed);
  }, [setLog.reps_completed, setLog.weight_value, setLog.is_completed]);

  const debouncedUpdate = useCallback(
    (data: SetLogUpdate) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onUpdate(setLog.id, data).catch(console.error);
      }, 400);
    },
    [onUpdate, setLog.id]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function handleRepsChange(value: string) {
    setReps(value);
    const parsed = value === "" ? null : parseInt(value, 10);
    if (value !== "" && isNaN(parsed as number)) return;
    debouncedUpdate({ reps_completed: parsed });
  }

  function handleWeightChange(value: string) {
    setWeight(value);
    const parsed = value === "" ? null : parseFloat(value);
    if (value !== "" && isNaN(parsed as number)) return;
    debouncedUpdate({ weight_value: parsed });
  }

  function handleToggleComplete() {
    const next = !completed;
    setCompleted(next);
    onUpdate(setLog.id, { is_completed: next }).catch(console.error);
  }

  return (
    <div
      className={[
        "flex items-center gap-2 rounded-lg border px-3 py-2 transition-all duration-200",
        completed
          ? "border-emerald-500/20 bg-emerald-500/5"
          : "border-white/5 bg-slate-800/30",
      ].join(" ")}
    >
      {/* Set number */}
      <span className="w-10 flex-shrink-0 text-xs font-bold text-slate-500">
        Set {setLog.set_number}
      </span>

      {/* Planned reps reference */}
      <span className="w-14 flex-shrink-0 text-xs text-slate-600">
        {setLog.planned_reps ?? "—"}
      </span>

      {/* Reps input */}
      <div className="flex flex-1 items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={999}
          value={reps}
          onChange={(e) => handleRepsChange(e.target.value)}
          disabled={!isEditable}
          placeholder="Reps"
          className="w-full rounded-md border border-white/5 bg-slate-800/50 px-2.5 py-1.5 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Weight input */}
      <div className="flex flex-1 items-center gap-1">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={9999}
          step="2.5"
          value={weight}
          onChange={(e) => handleWeightChange(e.target.value)}
          disabled={!isEditable}
          placeholder="Weight"
          className="w-full rounded-md border border-white/5 bg-slate-800/50 px-2.5 py-1.5 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        />
        <span className="flex-shrink-0 text-xs text-slate-500">lbs</span>
      </div>

      {/* Complete checkmark */}
      <button
        type="button"
        onClick={handleToggleComplete}
        disabled={!isEditable}
        className={[
          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
          completed
            ? "bg-emerald-500 text-white"
            : "border border-white/10 bg-slate-800/50 text-slate-500 hover:border-emerald-400/30 hover:bg-emerald-500/10",
        ].join(" ")}
        aria-label={completed ? "Mark incomplete" : "Mark complete"}
      >
        <svg
          className="h-4 w-4"
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
      </button>

      {/* Delete set button */}
      {isEditable && (
        <button
          type="button"
          onClick={() => onDelete(setLog.id)}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-600 transition-all duration-200 hover:bg-rose-500/10 hover:text-rose-400"
          aria-label="Delete set"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
