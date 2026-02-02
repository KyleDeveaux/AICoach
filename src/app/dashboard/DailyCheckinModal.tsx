// app/dashboard/DailyCheckinModal.tsx
"use client";

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

  title: string;
  backfillDays: BackfillDay[];

  checkinDate: string;
  setCheckinDate: (date: string) => void;

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
  hasExistingCheckin: boolean;
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
  caloriesExceeded,
  workoutRating,
  setWorkoutRating,
  notes,
  setNotes,
  message,
  isLoading,
  onSave,
  hasExistingCheckin,
}: DailyCheckinModalProps) {
  if (!isOpen) return null;

  const safeClose = () => {
    if (!isLoading) onClose();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/5 bg-slate-900 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="border-b border-white/5 bg-slate-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {isBackfillMode
                  ? "Logging a past day helps keep your stats accurate"
                  : "Quick check-in — be honest, this is for you"}
              </p>
            </div>

            <button
              type="button"
              onClick={safeClose}
              disabled={isLoading}
              aria-label="Close"
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-slate-700/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6 text-sm">
          {/* Backfill date picker */}
          {isBackfillMode && (
            <div>
              <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Which day are you logging?
              </label>
              <select
                value={checkinDate}
                onChange={(e) => setCheckinDate(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border border-white/5 bg-slate-800/50 px-4 py-3 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {backfillDays.map((d) => (
                  <option key={d.isoDate} value={d.isoDate} className="bg-slate-900">
                    {d.dayName} – {d.dateLabel}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Did workout? */}
          <div>
            <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <svg className="h-4 w-4 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Did you work out this day?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => !isLoading && setDidWorkout(true)}
                disabled={isLoading}
                className={[
                  "rounded-lg border px-5 py-4 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70",
                  didWorkout === true
                    ? "border-cyan-500 bg-cyan-600 text-white"
                    : "border-white/5 bg-slate-800/50 text-slate-400 hover:border-cyan-400/30 hover:bg-cyan-500/10",
                ].join(" ")}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Yes
                </div>
              </button>
              <button
                type="button"
                onClick={() => !isLoading && setDidWorkout(false)}
                disabled={isLoading}
                className={[
                  "rounded-lg border px-5 py-4 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70",
                  didWorkout === false
                    ? "border-amber-500 bg-amber-600 text-white"
                    : "border-white/5 bg-slate-800/50 text-slate-400 hover:border-amber-400/30 hover:bg-amber-500/10",
                ].join(" ")}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  No
                </div>
              </button>
            </div>
          </div>

          {/* Hit calories? */}
          <div>
            <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Did you stay close to your calorie target?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => !isLoading && !(caloriesExceeded && !isBackfillMode) && setHitCalories(true)}
                disabled={isLoading || (caloriesExceeded && !isBackfillMode)}
                className={[
                  "rounded-lg border px-5 py-4 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70",
                  hitCalories === true
                    ? "border-blue-500 bg-cyan-600 text-white"
                    : "border-white/5 bg-slate-800/50 text-slate-400 hover:border-blue-400/30 hover:bg-cyan-500/10",
                ].join(" ")}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Yes
                </div>
              </button>
              <button
                type="button"
                onClick={() => !isLoading && setHitCalories(false)}
                disabled={isLoading}
                className={[
                  "rounded-lg border px-5 py-4 text-sm font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-70",
                  hitCalories === false
                    ? "border-amber-500 bg-amber-600 text-white"
                    : "border-white/5 bg-slate-800/50 text-slate-400 hover:border-amber-400/30 hover:bg-amber-500/10",
                ].join(" ")}
              >
                <div className="flex items-center justify-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  No
                </div>
              </button>
            </div>

            {caloriesExceeded && !isBackfillMode && (
              <p className="mt-2 text-xs font-medium text-amber-400/80">
                Your logged calories exceed your target — this has been set to No automatically.
              </p>
            )}
          </div>

          {/* Workout rating */}
          {didWorkout === true && (
            <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
              <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-300">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                How would you rate your workout?
              </label>
              <input
                type="range"
                min={1}
                max={10}
                value={workoutRating ?? 7}
                onChange={(e) => setWorkoutRating(Number(e.target.value))}
                disabled={isLoading}
                className="w-full accent-purple-500 disabled:cursor-not-allowed disabled:opacity-70"
              />
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs font-medium text-purple-400">Poor</span>
                <div className="flex items-center gap-2 rounded-xl bg-slate-800/50 px-4 py-2">
                  <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-lg font-bold text-purple-300">{workoutRating ?? 7}</span>
                </div>
                <span className="text-xs font-medium text-purple-400">Amazing</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Any quick notes about this day?
            </label>
            <textarea
              rows={4}
              disabled={isLoading}
              className="w-full rounded-lg border border-white/5 bg-slate-800/50 px-4 py-3 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20 disabled:cursor-not-allowed disabled:opacity-70"
              placeholder="Example: Ate out for lunch, felt low energy at the gym..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        {message && (
          <div className="border-t border-white/5 bg-cyan-500/10 px-6 py-3">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-medium text-cyan-300">{message}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 border-t border-white/5 p-6">
          <button
            type="button"
            onClick={safeClose}
            disabled={isLoading}
            className="flex-1 rounded-lg border border-white/5 bg-slate-800/50 px-5 py-3 text-sm font-bold text-slate-400 transition-all duration-200 hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onSave}
            disabled={isLoading}
            aria-busy={isLoading}
            className="flex-[2] rounded-lg bg-cyan-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="inline-flex items-center justify-center gap-2">
              {isLoading && <Spinner size={16} className="text-white" />}
              {isLoading ? "Saving your check-in…" : hasExistingCheckin ? "Update check-in" : "Save check-in"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
