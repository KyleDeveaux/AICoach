"use client";

import { useState } from "react";
import type { WorkoutExercise } from "../lib/types";

type PlanAddExerciseFormProps = {
  onAdd: (exercise: WorkoutExercise) => void;
};

export default function PlanAddExerciseForm({
  onAdd,
}: PlanAddExerciseFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [sets, setSets] = useState("3");
  const [reps, setReps] = useState("10");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setName("");
    setSets("3");
    setReps("10");
    setError(null);
  }

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Enter an exercise name.");
      return;
    }

    const parsedSets = parseInt(sets, 10);
    if (isNaN(parsedSets) || parsedSets < 1 || parsedSets > 10) {
      setError("Sets must be between 1 and 10.");
      return;
    }

    const trimmedReps = reps.trim();
    if (!trimmedReps) {
      setError("Enter reps (e.g. 10, 8-12, AMRAP).");
      return;
    }

    setError(null);

    onAdd({
      name: trimmedName,
      sets: parsedSets,
      reps: trimmedReps,
      rest_seconds: 60,
    });

    resetForm();
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-slate-800/30 px-4 py-3 text-sm font-bold text-slate-400 transition-all duration-200 hover:border-white/20 hover:bg-slate-800/50 hover:text-white"
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
            d="M12 4v16m8-8H4"
          />
        </svg>
        Add Exercise
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-white/5 bg-slate-800/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Add exercise to plan
        </p>
        <button
          type="button"
          onClick={() => {
            resetForm();
            setIsOpen(false);
          }}
          className="text-xs font-medium text-slate-500 hover:text-white"
        >
          Cancel
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          placeholder="Exercise name"
          className="w-full rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2.5 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20"
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Sets
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              value={sets}
              onChange={(e) => {
                setSets(e.target.value);
                setError(null);
              }}
              className="w-full rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2.5 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              Reps
            </label>
            <input
              type="text"
              value={reps}
              onChange={(e) => {
                setReps(e.target.value);
                setError(null);
              }}
              placeholder="e.g. 8-10"
              className="w-full rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2.5 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2">
            <svg
              className="h-4 w-4 text-rose-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs font-medium text-rose-300">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-cyan-500"
        >
          Add Exercise
        </button>
      </div>
    </div>
  );
}
