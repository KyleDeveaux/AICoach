"use client";

import type { ActivityLogRow } from "../lib/types";

type ActivityLogCardProps = {
  activity: ActivityLogRow;
  onDelete: (id: string) => void;
  isDeleting: boolean;
};

const intensityConfig = {
  light: { label: "Light", bg: "bg-emerald-500/20", text: "text-emerald-400" },
  moderate: { label: "Moderate", bg: "bg-amber-500/20", text: "text-amber-400" },
  hard: { label: "Hard", bg: "bg-rose-500/20", text: "text-rose-400" },
};

export default function ActivityLogCard({
  activity,
  onDelete,
  isDeleting,
}: ActivityLogCardProps) {
  const config = intensityConfig[activity.intensity] ?? intensityConfig.moderate;

  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/5 bg-slate-800/30 px-4 py-3">
      {/* Activity icon */}
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-500/20">
        <svg
          className="h-4 w-4 text-cyan-400"
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
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-white">
            {activity.activity_name}
          </p>
          <span
            className={[
              "rounded-full px-2 py-0.5 text-[10px] font-bold",
              config.bg,
              config.text,
            ].join(" ")}
          >
            {config.label}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-400">
          {activity.duration_minutes} min
        </p>
        {activity.notes && (
          <p className="mt-1 text-xs italic text-slate-500">
            {activity.notes}
          </p>
        )}
      </div>

      {/* Delete button */}
      <button
        type="button"
        onClick={() => onDelete(activity.id)}
        disabled={isDeleting}
        className="flex-shrink-0 rounded p-1 text-slate-600 transition-colors hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Delete activity"
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
