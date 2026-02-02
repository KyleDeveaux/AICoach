"use client";

import { useEffect, useMemo, useState } from "react";

function normalizeExerciseKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type WorkoutDemoModalProps = {
  isOpen: boolean;
  onClose: () => void;

  exerciseName: string;
  initialUrl: string | null;

  onSave: (exerciseName: string, url: string) => Promise<void>;
  onRemove: (exerciseName: string) => Promise<void>;

  isSaving: boolean;
};

function isProbablyValidUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function getHostnameSafe(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export default function WorkoutDemoModal({
  isOpen,
  onClose,
  exerciseName,
  initialUrl,
  onSave,
  onRemove,
  isSaving,
}: WorkoutDemoModalProps) {
  const [url, setUrl] = useState(initialUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const nextUrl = initialUrl ?? "";
    setUrl(nextUrl);
    setError(null);
    const hasSaved = !!nextUrl.trim() && isProbablyValidUrl(nextUrl.trim());
    setIsEditing(!hasSaved);
  }, [isOpen, exerciseName, initialUrl]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const searchQuery = useMemo(
    () => `${exerciseName} proper form`,
    [exerciseName]
  );

  if (!isOpen) return null;

  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&tbm=vid`;

  const savedUrl = (initialUrl ?? "").trim();
  const hasSavedUrl = !!savedUrl && isProbablyValidUrl(savedUrl);
  const savedHost = hasSavedUrl ? getHostnameSafe(savedUrl) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/5 bg-slate-900 shadow-xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="border-b border-white/5 bg-slate-800 p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  Exercise demo
                </p>
              </div>
              <h3 className="mt-2 truncate text-lg font-bold text-white">
                {exerciseName}
              </h3>
            </div>

            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition-all duration-200 hover:bg-slate-700/50 hover:text-white"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {/* Default view: saved demo */}
          {hasSavedUrl && !isEditing && (
            <div className="overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-600">
                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-400">
                      Saved demo
                    </p>
                  </div>
                  <p className="mt-2 truncate text-sm font-bold text-emerald-300">
                    {savedHost ?? "Saved link"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-300 transition-all duration-200 hover:bg-cyan-500/20"
                >
                  Change
                </button>
              </div>

              <a
                href={savedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-cyan-500"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Watch demo
              </a>
            </div>
          )}

          {/* Edit view */}
          {(isEditing || !hasSavedUrl) && (
            <>
              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Search for a demo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <a
                    href={youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg bg-red-600 px-4 py-3 text-xs font-bold text-white transition-all duration-200 hover:bg-red-500"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                      </svg>
                      YouTube
                    </div>
                  </a>
                  <a
                    href={googleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg border border-white/10 bg-slate-800/50 px-4 py-3 text-xs font-bold text-white transition-all duration-200 hover:bg-slate-700/50"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                      </svg>
                      Google
                    </div>
                  </a>
                </div>
              </div>

              <div>
                <label className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <svg className="h-4 w-4 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Paste demo link
                </label>
                <input
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  placeholder="Paste a YouTube link (or any https link)"
                  className="w-full rounded-lg border border-white/5 bg-slate-800/50 px-4 py-3 text-sm font-medium text-white placeholder-white/30 outline-none transition-all duration-200 focus:border-white/10 focus:ring-1 focus:ring-white/20"
                />
                {error && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-rose-500/10 px-3 py-2">
                    <svg className="h-4 w-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs font-medium text-rose-300">{error}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {(isEditing || !hasSavedUrl) && (
          <div className="flex gap-3 border-t border-white/5 p-6">
            {hasSavedUrl && (
              <button
                type="button"
                disabled={isSaving || !hasSavedUrl}
                onClick={async () => {
                  try {
                    await onRemove(exerciseName);
                    setUrl("");
                    setIsEditing(true);
                  } catch {
                    setError("Failed to remove link. Please try again.");
                  }
                }}
                className="flex-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-5 py-3 text-sm font-bold text-rose-400 transition-all duration-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Remove
              </button>
            )}

            {hasSavedUrl && (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setError(null);
                  setUrl(savedUrl);
                  setIsEditing(false);
                }}
                className="flex-1 rounded-lg border border-white/5 bg-slate-800/50 px-5 py-3 text-sm font-bold text-slate-400 transition-all duration-200 hover:bg-slate-700/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            )}

            <button
              type="button"
              disabled={isSaving}
              onClick={async () => {
                const trimmed = url.trim();
                if (!trimmed) {
                  setError("Paste a link first.");
                  return;
                }
                if (!isProbablyValidUrl(trimmed)) {
                  setError("That doesn't look like a valid https URL.");
                  return;
                }
                try {
                  await onSave(exerciseName, trimmed);
                  onClose();
                } catch {
                  setError("Failed to save link. Please try again.");
                }
              }}
              className={[
                "rounded-lg bg-cyan-600 px-6 py-3 text-sm font-bold text-white transition-all duration-200 hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50",
                hasSavedUrl ? "flex-[2]" : "flex-1",
              ].join(" ")}
            >
              {isSaving ? "Saving…" : hasSavedUrl ? "Update link" : "Save link"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export { normalizeExerciseKey };
