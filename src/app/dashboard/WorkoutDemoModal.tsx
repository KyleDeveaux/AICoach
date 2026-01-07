"use client";

import React, { useEffect, useMemo, useState } from "react";

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

  // ✅ NEW: "simple" default view vs "edit" view
  const [isEditing, setIsEditing] = useState(false);

  // reset when opening / switching exercise
  useEffect(() => {
    if (!isOpen) return;

    const nextUrl = initialUrl ?? "";
    setUrl(nextUrl);
    setError(null);

    const hasSaved = !!nextUrl.trim() && isProbablyValidUrl(nextUrl.trim());
    // If we already have a saved link, default to the clean "watch" view.
    // If not, default to edit view so user can add one.
    setIsEditing(!hasSaved);
  }, [isOpen, exerciseName, initialUrl]);

  // close on Escape
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

  const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    searchQuery
  )}`;

  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
    searchQuery
  )}&tbm=vid`;

  const savedUrl = (initialUrl ?? "").trim();
  const hasSavedUrl = !!savedUrl && isProbablyValidUrl(savedUrl);
  const savedHost = hasSavedUrl ? getHostnameSafe(savedUrl) : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Exercise demo
            </p>
            <h3 className="mt-1 truncate text-base font-semibold text-slate-900">
              {exerciseName}
            </h3>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-4">
          {/* ✅ CLEAN DEFAULT VIEW: show only the saved demo + one subtle action */}
          {hasSavedUrl && !isEditing && (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Saved demo
                  </p>
                  <p className="mt-1 truncate text-sm font-medium text-slate-800">
                    {savedHost ?? "Saved link"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white"
                >
                  Change link
                </button>
              </div>

              <a
                href={savedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                Watch demo
              </a>
            </div>
          )}

          {/* ✅ EDIT VIEW: tools appear only when needed */}
          {(isEditing || !hasSavedUrl) && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Search YouTube
                </a>
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Search Google
                </a>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Demo link
                </label>
                <input
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  placeholder="Paste a YouTube link (or any https link)"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
                {error && (
                  <p className="mt-1 text-xs text-rose-600">{error}</p>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={isSaving || !hasSavedUrl}
                  onClick={async () => {
                    try {
                      await onRemove(exerciseName);
                      // after remove, keep them in edit mode so they can add a new one
                      setUrl("");
                      setIsEditing(true);
                    } catch {
                      setError("Failed to remove link. Please try again.");
                    }
                  }}
                  className="rounded-full px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remove
                </button>

                <div className="flex items-center gap-2">
                  {hasSavedUrl && (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => {
                        setError(null);
                        setUrl(savedUrl);
                        setIsEditing(false);
                      }}
                      className="rounded-full px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                        setError("That doesn’t look like a valid https URL.");
                        return;
                      }

                      try {
                        await onSave(exerciseName, trimmed);
                        onClose();
                      } catch {
                        setError("Failed to save link. Please try again.");
                      }
                    }}
                    className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {isSaving ? "Saving…" : hasSavedUrl ? "Update" : "Save"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { normalizeExerciseKey };
