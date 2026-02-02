"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import WorkoutDemoModal, { normalizeExerciseKey } from "./WorkoutDemoModal";

type WeekDayInfo = {
  dayName: string;
  dateLabel: string;
  isoDate: string;
  isToday?: boolean;
};

type Exercise = {
  name: string;
  reps: number;
  sets: number;
  notes: string | null;
  gifUrl: string | null;
  rest_seconds: number;
  gifSearchTerm: string;
};

type WorkoutDay = {
  dayOfWeek: string;
  workoutName: string;
  exercises: Exercise[];
};

type WorkoutPlanCardProps = {
  profileId: string;

  weekDaysInfo: WeekDayInfo[];
  selectedDayName: string;
  setSelectedDayName: (day: string) => void;

  selectedWorkout: WorkoutDay | null;
  workoutDaysSet: Set<string>;
};

type DemoRow = {
  exercise_key: string;
  url: string;
};

export default function WorkoutPlanCard({
  profileId,
  weekDaysInfo,
  selectedDayName,
  setSelectedDayName,
  selectedWorkout,
  workoutDaysSet,
}: WorkoutPlanCardProps) {
  const [demoMap, setDemoMap] = useState<Record<string, string>>({});
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoSaving, setDemoSaving] = useState(false);

  const [demoOpen, setDemoOpen] = useState(false);
  const [activeExerciseName, setActiveExerciseName] = useState<string>("");

  const exercises = selectedWorkout?.exercises ?? [];

  const exerciseKeys = useMemo(() => {
    return exercises.map((e) => normalizeExerciseKey(e.name));
  }, [exercises]);

  async function loadDemos() {
    if (!profileId) return;
    if (exerciseKeys.length === 0) {
      setDemoMap({});
      return;
    }

    setDemoLoading(true);
    try {
      const { data, error } = await supabase
        .from("exercise_demo_links")
        .select("exercise_key, url")
        .eq("profile_id", profileId)
        .in("exercise_key", exerciseKeys);

      if (error) throw error;

      const map: Record<string, string> = {};
      (data as DemoRow[] | null)?.forEach((row) => {
        map[row.exercise_key] = row.url;
      });

      setDemoMap(map);
    } catch (err) {
      console.error("Failed to load demo links:", err);
      // don’t hard error UI — just silently fail
      setDemoMap({});
    } finally {
      setDemoLoading(false);
    }
  }

  useEffect(() => {
    loadDemos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, selectedDayName, selectedWorkout?.workoutName, exerciseKeys.join("|")]);

  const activeKey = normalizeExerciseKey(activeExerciseName);
  const activeUrl = demoMap[activeKey] ?? null;

  async function handleSaveDemo(exerciseName: string, url: string) {
    if (!profileId) return;
    setDemoSaving(true);
    try {
      const exercise_key = normalizeExerciseKey(exerciseName);

      const { error } = await supabase.from("exercise_demo_links").upsert(
        {
          profile_id: profileId,
          exercise_key,
          exercise_name: exerciseName,
          url,
        },
        { onConflict: "profile_id,exercise_key" }
      );

      if (error) throw error;

      setDemoMap((prev) => ({ ...prev, [exercise_key]: url }));
    } catch (err) {
      console.error("Failed to save demo link:", err);
    } finally {
      setDemoSaving(false);
    }
  }

  async function handleRemoveDemo(exerciseName: string) {
    if (!profileId) return;
    setDemoSaving(true);
    try {
      const exercise_key = normalizeExerciseKey(exerciseName);

      const { error } = await supabase
        .from("exercise_demo_links")
        .delete()
        .eq("profile_id", profileId)
        .eq("exercise_key", exercise_key);

      if (error) throw error;

      setDemoMap((prev) => {
        const copy = { ...prev };
        delete copy[exercise_key];
        return copy;
      });
    } catch (err) {
      console.error("Failed to remove demo link:", err);
    } finally {
      setDemoSaving(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md md:p-7">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900">
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-slate-900 md:text-lg">
            Weekly Workout Plan
          </h2>
        </div>

        <div className="rounded-full bg-slate-100 px-4 py-1.5">
          <span className="text-xs font-bold text-slate-900">{selectedDayName}</span>
        </div>
      </div>

      {/* Clean Calendar */}
      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <div className="grid grid-cols-7 gap-2">
          {weekDaysInfo.map((d) => {
            const isSelected = d.dayName === selectedDayName;
            const isWorkoutDay = workoutDaysSet.has(d.dayName);
            const isToday = d.isToday;

            return (
              <button
                key={d.isoDate}
                type="button"
                onClick={() => setSelectedDayName(d.dayName)}
                className={[
                  "relative rounded-lg px-2 py-3 text-center transition-all duration-200",
                  isSelected
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100",
                ].join(" ")}
              >
                {isToday && !isSelected && (
                  <div className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-blue-500" />
                )}

                <p className={[
                  "text-[10px] font-bold tracking-wider",
                  isSelected ? "text-white/90" : "text-slate-500"
                ].join(" ")}>
                  {d.dayName.slice(0, 3).toUpperCase()}
                </p>
                <p className={[
                  "mt-1 text-sm font-bold",
                  isSelected ? "text-white" : "text-slate-900"
                ].join(" ")}>
                  {d.dateLabel}
                </p>

                {/* Workout indicator */}
                <div className="mt-2 flex items-center justify-center">
                  {isWorkoutDay ? (
                    <div className={[
                      "flex h-5 w-5 items-center justify-center rounded",
                      isSelected
                        ? "bg-white/20"
                        : "bg-emerald-100"
                    ].join(" ")}>
                      <svg className={[
                        "h-3 w-3",
                        isSelected ? "text-white" : "text-emerald-600"
                      ].join(" ")} fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-slate-200" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workout Details */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={[
              "h-2 w-2 rounded-full",
              exercises.length > 0 ? "bg-emerald-500" : "bg-slate-300"
            ].join(" ")} />
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {selectedWorkout?.workoutName ?? "Rest day"}
            </p>
          </div>

          {exercises.length > 0 && (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {exercises.length} {exercises.length === 1 ? 'exercise' : 'exercises'}
            </span>
          )}
        </div>

        {/* Subtle loading note (optional) */}
        {demoLoading && exercises.length > 0 && (
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1 w-1 animate-pulse rounded-full bg-blue-500" />
            <p className="text-xs font-medium text-slate-400">Loading saved demos…</p>
          </div>
        )}

        {/* Exercise list */}
        <div className="mt-4 space-y-3">
          {exercises.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                <svg className="h-8 w-8 text-slate-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <p className="mt-4 text-sm font-semibold text-slate-700">Rest Day</p>
              <p className="mt-1 text-xs text-slate-500">
                No workout scheduled for this day
              </p>
            </div>
          ) : (
            exercises.map((ex, idx) => {
              const key = normalizeExerciseKey(ex.name);
              const hasDemo = Boolean(demoMap[key]);

              return (
                <button
                  key={`${key}-${idx}`}
                  type="button"
                  onClick={() => {
                    setActiveExerciseName(ex.name);
                    setDemoOpen(true);
                  }}
                  className="w-full text-left"
                  style={{
                    animation: `slideIn 0.3s ease-out ${idx * 0.05}s both`
                  }}
                >
                  <div className="rounded-lg border border-slate-200 bg-white p-4 transition-all duration-200 hover:shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      {/* Exercise icon + name */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                          <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-slate-900">
                            {ex.name}
                          </p>

                          <div className="mt-1 flex items-center gap-2 text-xs">
                            {hasDemo && (
                              <span className="flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                  <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                </svg>
                                Demo
                              </span>
                            )}
                            {ex.rest_seconds > 0 && (
                              <span className="font-medium text-slate-500">
                                {ex.rest_seconds}s rest
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Sets x Reps */}
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="rounded-lg bg-slate-100 px-3 py-1.5">
                            <p className="text-sm font-bold text-slate-900">
                              {ex.sets} × {ex.reps}
                            </p>
                          </div>
                        </div>

                        {/* Arrow */}
                        <svg className="h-5 w-5 text-slate-400 transition-all duration-200 group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>

                    {/* Exercise notes */}
                    {ex.notes && (
                      <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">
                        <p className="text-xs text-slate-600">{ex.notes}</p>
                      </div>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <WorkoutDemoModal
        isOpen={demoOpen}
        onClose={() => setDemoOpen(false)}
        exerciseName={activeExerciseName}
        initialUrl={activeUrl}
        onSave={handleSaveDemo}
        onRemove={handleRemoveDemo}
        isSaving={demoSaving}
      />

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
