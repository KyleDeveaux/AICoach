"use client";

import {
  useState,
  useEffect,
  FormEvent,
  ChangeEvent,
  useCallback,
} from "react";
import { supabase } from "../lib/supabaseClient";
import DashboardNav from "../dashboard/DashboardNav";
import { ClientProfile } from "../lib/types";

type BodyCheckAnalysis = {
  summary: string;
  focusAreas?: string[];
  updatedPlanNotes?: string;
};

type BodyCheckRow = {
  id: string;
  image_path: string | null;
  summary: string | null;
  focus_areas: string[] | null;
  plan_notes: string | null;
  created_at: string;
};

type TimelineEntry = {
  id: string;
  createdAt: string;
  summary: string | null;
  focusAreas: string[] | null;
  planNotes: string | null;
  imagePath: string | null;
  signedUrl: string | null;
};

// simple date formatter
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function normalizeAreas(areas: string[] | null | undefined) {
  return (areas ?? []).map((s) => s.trim()).filter(Boolean);
}

function buildCompareSummary(a: TimelineEntry, b: TimelineEntry) {
  // Ensure we talk from older -> newer
  const aTime = new Date(a.createdAt).getTime();
  const bTime = new Date(b.createdAt).getTime();
  const older = aTime <= bTime ? a : b;
  const newer = aTime <= bTime ? b : a;

  const olderAreas = normalizeAreas(older.focusAreas);
  const newerAreas = normalizeAreas(newer.focusAreas);

  const olderSet = new Set(olderAreas.map((x) => x.toLowerCase()));
  const newerSet = new Set(newerAreas.map((x) => x.toLowerCase()));

  const shared = newerAreas.filter((x) => olderSet.has(x.toLowerCase()));
  const newlyAdded = newerAreas.filter((x) => !olderSet.has(x.toLowerCase()));
  const deEmphasized = olderAreas.filter((x) => !newerSet.has(x.toLowerCase()));

  const dateLine = `From ${formatDateShort(
    older.createdAt
  )} → ${formatDateShort(newer.createdAt)}:`;

  const sharedLine =
    shared.length > 0
      ? `You stayed consistent on: ${shared.join(", ")}.`
      : `Your focus areas shifted quite a bit between these two check-ins.`;

  const addedLine =
    newlyAdded.length > 0
      ? `New emphasis: ${newlyAdded.join(", ")}.`
      : `No new focus areas popped up on the newer check-in.`;

  const removedLine =
    deEmphasized.length > 0
      ? `Less emphasis now: ${deEmphasized.join(", ")}.`
      : `Nothing dropped off — you’re building consistency.`;

  let nextStep = `This week: keep 1–2 priorities and push them hard (extra sets or an extra day), then keep everything else on maintenance.`;
  if (newlyAdded.length > 0) {
    nextStep = `This week: treat **${newlyAdded[0]}** as your #1 priority (add 2–4 working sets across the week), and keep the rest steady.`;
  } else if (shared.length > 0) {
    nextStep = `This week: double down on **${shared[0]}** — add a little volume or tighten execution, and keep the rest consistent.`;
  }

  return {
    older,
    newer,
    shared,
    newlyAdded,
    deEmphasized,
    text: `${dateLine} ${sharedLine} ${addedLine} ${removedLine} ${nextStep}`,
  };
}

// 🔹 Client-side image compression helper
async function compressImage(
  file: File,
  maxWidth = 900,
  maxHeight = 900,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        let { width, height } = img;

        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = width * ratio;
        height = height * ratio;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return reject(new Error("Failed to get canvas context"));
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);

            if (!blob) {
              return reject(new Error("Failed to create compressed image"));
            }

            const compressedFile = new File([blob], "body-check.jpg", {
              type: "image/jpeg",
            });

            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}

/** ✅ Shared spinner */
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

/** ✅ Fullscreen overlay during analysis */
function LoadingOverlay({ label }: { label?: string }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="flex items-center gap-3">
          <Spinner size={18} className="text-blue-600" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {label ?? "Analyzing photo…"}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Hang tight — this usually takes a few seconds.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalShell({
  title,
  subtitle,
  onClose,
  children,
  maxWidthClass = "max-w-6xl",
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClass?: string;
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={[
          "mx-auto flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl",
          maxWidthClass,
        ].join(" ")}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 p-4 md:p-5">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            {subtitle && (
              <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
            )}
          </div>

          <button
            onClick={onClose}
            aria-label="Close modal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function DetailsModal({
  entry,
  onClose,
}: {
  entry: TimelineEntry;
  onClose: () => void;
}) {
  return (
    <ModalShell
      title="Body check details"
      subtitle={formatDate(entry.createdAt)}
      onClose={onClose}
      maxWidthClass="max-w-4xl"
    >
      <div className="grid gap-4 p-4 md:grid-cols-2 md:p-5">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
          {entry.signedUrl ? (
            <img
              src={entry.signedUrl}
              alt="Body check"
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-64 w-full items-center justify-center text-sm text-slate-400">
              Image unavailable
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Coach summary
            </p>
            <p className="mt-1 text-sm text-slate-800">
              {entry.summary || "Body-check completed."}
            </p>
          </div>

          {entry.focusAreas && entry.focusAreas.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Focus areas
              </p>
              <ul className="mt-1 list-disc pl-5 text-sm text-slate-800">
                {entry.focusAreas.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          {entry.planNotes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                This week’s adjustments
              </p>
              <p className="mt-1 text-sm text-slate-800">{entry.planNotes}</p>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

function CompareModal({
  left,
  right,
  onClose,
}: {
  left: TimelineEntry;
  right: TimelineEntry;
  onClose: () => void;
}) {
  const localSummary = buildCompareSummary(left, right);

  const [llmSummary, setLlmSummary] = useState<string | null>(null);
  const [summarySource, setSummarySource] = useState<
    "loading" | "model" | "fallback"
  >("loading");

  const [summaryError, setSummaryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCompareSummary() {
      try {
        setSummarySource("loading");
        setSummaryError(null);
        setLlmSummary(null);

        const payload = {
          left: {
            createdAt: left.createdAt,
            summary: left.summary ?? null,
            focusAreas: left.focusAreas ?? null,
            planNotes: left.planNotes ?? null,
          },
          right: {
            createdAt: right.createdAt,
            summary: right.summary ?? null,
            focusAreas: right.focusAreas ?? null,
            planNotes: right.planNotes ?? null,
          },
        };

        const res = await fetch("/api/body-check/compare-summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to generate compare summary.");
        }

        const data = (await res.json()) as {
          summary?: string;
          source?: "model" | string;
        };

        if (cancelled) return;

        if (typeof data.summary === "string" && data.summary.trim().length > 0) {
          setLlmSummary(data.summary.trim());
          setSummarySource(data.source === "model" ? "model" : "fallback");
        } else {
          setSummarySource("fallback");
        }
      } catch (err) {
        if (cancelled) return;
        setSummarySource("fallback");
        setSummaryError(
          err instanceof Error ? err.message : "Failed to load summary."
        );
      }
    }

    fetchCompareSummary();

    return () => {
      cancelled = true;
    };
  }, [
    left.createdAt,
    left.summary,
    left.planNotes,
    JSON.stringify(left.focusAreas ?? []),
    right.createdAt,
    right.summary,
    right.planNotes,
    JSON.stringify(right.focusAreas ?? []),
  ]);

  const headline = `${formatDateShort(
    localSummary.older.createdAt
  )} vs ${formatDateShort(localSummary.newer.createdAt)}`;

  return (
    <ModalShell
      title="Compare body checks"
      subtitle={headline}
      onClose={onClose}
      maxWidthClass="max-w-6xl"
    >
      <div className="p-4 md:p-5">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                CoachIE compare summary
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                {summarySource === "loading" &&
                  "Generating a coach-style summary…"}
                {summarySource === "model" && "Generated by CoachIE"}
                {summarySource === "fallback" && "Quick summary"}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-slate-800">
            {llmSummary ?? localSummary.text}
          </p>

          {summaryError && (
            <p className="mt-2 text-[11px] text-rose-600">{summaryError}</p>
          )}
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {left.signedUrl ? (
                <img
                  src={left.signedUrl}
                  alt="Left body check"
                  className="h-[420px] w-full object-contain"
                />
              ) : (
                <div className="flex h-[420px] w-full items-center justify-center text-sm text-slate-400">
                  Image unavailable
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              {right.signedUrl ? (
                <img
                  src={right.signedUrl}
                  alt="Right body check"
                  className="h-[420px] w-full object-contain"
                />
              ) : (
                <div className="flex h-[420px] w-full items-center justify-center text-sm text-slate-400">
                  Image unavailable
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}

export default function BodyCheckPage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [profile, setProfile] = useState<ClientProfile | null>(null);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<BodyCheckAnalysis | null>(null);

  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);

  const [detailsEntry, setDetailsEntry] = useState<TimelineEntry | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const loadTimeline = useCallback(async (pid: string) => {
    setTimelineLoading(true);

    const { data, error: fetchError } = await supabase
      .from("body_checks")
      .select("id, image_path, summary, focus_areas, plan_notes, created_at")
      .eq("profile_id", pid)
      .order("created_at", { ascending: false });

    if (fetchError) {
      console.error("Error loading body_checks history:", fetchError);
      setTimelineLoading(false);
      return;
    }

    const rows = (data ?? []) as BodyCheckRow[];

    const entries: TimelineEntry[] = await Promise.all(
      rows.map(async (row) => {
        let signedUrl: string | null = null;

        if (row.image_path) {
          const { data: signed, error: signedError } = await supabase.storage
            .from("body-checks")
            .createSignedUrl(row.image_path, 60 * 60);

          if (signedError) {
            console.error(
              "[timeline] signed URL error for",
              row.image_path,
              signedError
            );
          } else {
            signedUrl = signed.signedUrl;
          }
        }

        return {
          id: row.id,
          createdAt: row.created_at,
          summary: row.summary,
          focusAreas: row.focus_areas,
          planNotes: row.plan_notes,
          imagePath: row.image_path,
          signedUrl,
        };
      })
    );

    setTimeline(entries);
    setTimelineLoading(false);
  }, []);

  // ---- load profile id on mount ----
  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("No auth user for body-check:", userError);
        setError("You must be logged in to use Body Check.");
        return;
      }

      // ✅ Load full profile for DashboardNav so it renders correctly
      const { data: fullProfile, error: fullProfileError } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (fullProfileError || !fullProfile) {
        console.error("No client profile for user:", fullProfileError);
        setError("Could not load your profile.");
        return;
      }

      setProfile(fullProfile as ClientProfile);
      setProfileId(fullProfile.id as string);
    }

    loadProfile();
  }, []);

  // ---- load timeline when we have profileId ----
  useEffect(() => {
    if (!profileId) return;
    loadTimeline(profileId);
  }, [profileId, loadTimeline]);

  // preview clean-up
  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photoFile]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    setAnalysis(null);
    setPhotoFile(file);
  }

  function toggleCompareMode() {
    // ✅ Prevent toggling compare mode while analyzing (keeps UX stable)
    if (loading) return;

    setCompareMode((prev) => {
      const next = !prev;

      if (!next) {
        setCompareIds([]);
        setCompareOpen(false);
      }

      return next;
    });
  }

  function toggleCompareId(id: string) {
    if (loading) return;

    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  }

  const compareEntries = compareIds
    .map((id) => timeline.find((t) => t.id === id) ?? null)
    .filter(Boolean) as TimelineEntry[];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setAnalysis(null);

    if (!profileId) {
      setError("Profile not loaded yet.");
      return;
    }

    if (!photoFile) {
      setError("Please choose a progress photo to analyze.");
      return;
    }

    setLoading(true);

    try {
      const compressed = await compressImage(photoFile);

      if (compressed.size > 900 * 1024) {
        setError(
          "This photo is still too large after compression. Try cropping or choosing a smaller image."
        );
        setLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append("photo", compressed);
      formData.append("profileId", profileId);

      const res = await fetch("/api/body-check", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to analyze photo.");
      }

      const data = (await res.json()) as { analysis: BodyCheckAnalysis };
      setAnalysis(data.analysis);

      await loadTimeline(profileId);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload photo. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* ✅ Full-screen overlay while analysis is running */}
      {loading && <LoadingOverlay label="Analyzing your progress photo…" />}

      <DashboardNav profile={profile} />

      <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Body check
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Upload a progress photo and I&apos;ll highlight what to focus on
              this week.
            </p>
          </div>

          <a
            href="/dashboard"
            className="hidden rounded-full border border-slate-300 px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 md:inline-flex"
          >
            Back to dashboard
          </a>
        </header>

        <section className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)]">
          {/* LEFT: upload + feedback */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
              <h2 className="text-sm font-semibold text-slate-900">
                Upload a progress photo
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Clear full-body photo, good lighting, consistent angle if
                possible.
              </p>

              <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Photo
                  </label>
                  <div className="mt-2 flex flex-col items-start gap-2 sm:flex-row sm:items-center">
                    <label
                      className={[
                        "inline-flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700 hover:border-blue-400 hover:bg-blue-50",
                        loading ? "pointer-events-none opacity-70" : "",
                      ].join(" ")}
                    >
                      <span>Choose or take photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={loading}
                      />
                    </label>

                    {photoFile && (
                      <p className="text-[11px] text-slate-500">
                        Selected:{" "}
                        <span className="font-medium text-slate-700">
                          {photoFile.name}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {photoPreviewUrl && (
                  <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                    <img
                      src={photoPreviewUrl}
                      alt="Preview"
                      className="max-h-80 w-full object-contain"
                    />
                  </div>
                )}

                {error && (
                  <p className="text-xs font-medium text-rose-600">{error}</p>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !photoFile || !profileId}
                    aria-busy={loading}
                    className={[
                      "inline-flex items-center justify-center gap-2 rounded-full px-5 py-2 text-xs font-semibold shadow-sm",
                      loading || !photoFile || !profileId
                        ? "cursor-not-allowed bg-slate-300 text-slate-600"
                        : "bg-blue-600 text-white hover:bg-blue-700",
                    ].join(" ")}
                  >
                    {loading && <Spinner size={14} className="text-white/90" />}
                    <span>{loading ? "Analyzing…" : "Analyze my body"}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Coach feedback */}
            <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
              <h2 className="text-sm font-semibold text-slate-900">
                Coach feedback
              </h2>

              {!analysis && !loading && (
                <p className="mt-2 text-sm text-slate-500">
                  Upload a photo and I&apos;ll give you specific focus points +
                  what to do this week.
                </p>
              )}

              {loading && (
                <p className="mt-3 text-sm text-slate-600">
                  Reading your photo and building feedback… 🔍
                </p>
              )}

              {analysis && (
                <div className="mt-3 space-y-4 text-sm text-slate-700">
                  {analysis.summary && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Overall summary
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {analysis.summary}
                      </p>
                    </div>
                  )}

                  {analysis.focusAreas && analysis.focusAreas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Areas to prioritise
                      </p>
                      <ul className="mt-1 list-disc pl-5 text-sm text-slate-800">
                        {analysis.focusAreas.map((area) => (
                          <li key={area}>{area}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysis.updatedPlanNotes && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Plan adjustments
                      </p>
                      <p className="mt-1 text-sm text-slate-800">
                        {analysis.updatedPlanNotes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: timeline */}
          <div
            className={[
              "rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6",
              loading ? "opacity-70 pointer-events-none" : "",
            ].join(" ")}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Body-check timeline
              </h2>

              <button
                type="button"
                onClick={toggleCompareMode}
                className={[
                  "rounded-full px-4 py-2 text-xs font-semibold",
                  compareMode
                    ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    : "bg-slate-900 text-white hover:bg-slate-800",
                ].join(" ")}
              >
                {compareMode ? "Done" : "Compare"}
              </button>
            </div>

            {timelineLoading && (
              <p className="mt-2 text-sm text-slate-500">Loading timeline…</p>
            )}

            {!timelineLoading && timeline.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">
                Once you start uploading body-check photos, you&apos;ll see your
                history here.
              </p>
            )}

            <ol className="mt-3 space-y-3">
              {timeline.map((entry) => {
                const isSelected = compareIds.includes(entry.id);

                return (
                  <li key={entry.id}>
                    <div className="flex items-stretch gap-2">
                      {compareMode && (
                        <button
                          type="button"
                          onClick={() => toggleCompareId(entry.id)}
                          aria-label={
                            isSelected
                              ? "Unselect entry for compare"
                              : "Select entry for compare"
                          }
                          className={[
                            "flex w-12 items-center justify-center rounded-xl border text-xs font-semibold",
                            isSelected
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                          ].join(" ")}
                        >
                          {isSelected ? "✓" : "○"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setDetailsEntry(entry)}
                        className="w-full text-left"
                      >
                        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 hover:bg-slate-100">
                          <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                            {entry.signedUrl ? (
                              <img
                                src={entry.signedUrl}
                                alt="Body check thumbnail"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[10px] text-slate-400">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-500">
                              {formatDate(entry.createdAt)}
                            </p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-700">
                              {entry.summary || "Body-check completed."}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-400">
                              Click to view details
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      </div>

      {/* Sticky compare bar */}
      {compareMode && compareIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-4 z-40 px-4">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-lg">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900">
                {compareIds.length} selected
              </p>
              <p className="text-[11px] text-slate-500">
                Select 2 entries to compare side-by-side.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCompareIds([])}
                className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </button>

              <button
                type="button"
                disabled={compareIds.length !== 2}
                onClick={() => setCompareOpen(true)}
                className={[
                  "rounded-full px-4 py-2 text-xs font-semibold",
                  compareIds.length === 2
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "cursor-not-allowed bg-slate-200 text-slate-500",
                ].join(" ")}
              >
                Compare
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {detailsEntry && (
        <DetailsModal
          entry={detailsEntry}
          onClose={() => setDetailsEntry(null)}
        />
      )}

      {compareOpen && compareEntries.length === 2 && (
        <CompareModal
          left={compareEntries[0]}
          right={compareEntries[1]}
          onClose={() => setCompareOpen(false)}
        />
      )}
    </main>
  );
}
