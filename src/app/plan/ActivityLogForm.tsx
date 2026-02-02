"use client";

import { useState } from "react";
import type { ActivityIntensity } from "../lib/types";

type ActivityLogFormProps = {
  onSave: (data: {
    activity_name: string;
    duration_minutes: number;
    intensity: ActivityIntensity;
    notes: string | null;
  }) => Promise<void>;
  isSaving: boolean;
};

export default function ActivityLogForm({
  onSave,
  isSaving,
}: ActivityLogFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activityName, setActivityName] = useState("");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState<ActivityIntensity>("moderate");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  function resetForm() {
    setActivityName("");
    setDuration("");
    setIntensity("moderate");
    setNotes("");
    setError(null);
  }

  async function handleSubmit() {
    const trimmedName = activityName.trim();
    if (!trimmedName) {
      setError("Enter an activity name.");
      return;
    }

    const parsedDuration = parseInt(duration, 10);
    if (isNaN(parsedDuration) || parsedDuration < 1) {
      setError("Enter a valid duration in minutes.");
      return;
    }

    setError(null);

    try {
      await onSave({
        activity_name: trimmedName,
        duration_minutes: parsedDuration,
        intensity,
        notes: notes.trim() || null,
      });
      resetForm();
      setIsOpen(false);
    } catch {
      setError("Failed to save activity. Please try again.");
    }
  }

  // Collapsed state
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
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        Log Activity
      </button>
    );
  }

  // Expanded form
  const intensityOptions = [
    {
      value: "light" as const,
      label: "Light",
      activeColor: "bg-emerald-600 text-white",
    },
    {
      value: "moderate" as const,
      label: "Moderate",
      activeColor: "bg-amber-600 text-white",
    },
    {
      value: "hard" as const,
      label: "Hard",
      activeColor: "bg-rose-600 text-white",
    },
  ];

  return (
    <div className="rounded-lg border border-white/5 bg-slate-800/50 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Log Activity
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
        {/* Activity name */}
        <input
          type="text"
          value={activityName}
          onChange={(e) => {
            setActivityName(e.target.value);
            setError(null);
          }}
          placeholder="e.g. Running, Swimming, Pickleball..."
          disabled={isSaving}
          className="w-full rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2.5 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        />

        {/* Duration */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Duration (minutes)
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={duration}
            onChange={(e) => {
              setDuration(e.target.value);
              setError(null);
            }}
            placeholder="30"
            disabled={isSaving}
            className="w-full rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2.5 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        {/* Intensity segmented control */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Intensity
          </label>
          <div className="grid grid-cols-3 gap-2">
            {intensityOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setIntensity(opt.value)}
                disabled={isSaving}
                className={[
                  "rounded-lg px-3 py-2 text-xs font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50",
                  intensity === opt.value
                    ? opt.activeColor
                    : "border border-white/5 bg-slate-900/50 text-slate-400 hover:bg-slate-800/50 hover:text-white",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notes */}
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="How did it feel? Any details..."
          disabled={isSaving}
          rows={2}
          className="w-full resize-none rounded-lg border border-white/5 bg-slate-900/50 px-3 py-2.5 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50"
        />

        {/* Error */}
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

        {/* Save button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Activity"}
        </button>
      </div>
    </div>
  );
}
