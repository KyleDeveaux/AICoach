"use client";

import React, { useEffect, useMemo, useState } from "react";
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
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900 md:text-lg">
          Weekly workout plan
        </h2>

        <div className="rounded-full bg-slate-100 px-4 py-1.5 text-sm font-medium text-blue-700">
          {selectedDayName}
        </div>
      </div>

      {/* Calendar row */}
      <div className="mt-4 rounded-2xl bg-slate-50 p-3">
        <div className="grid grid-cols-7 gap-2">
          {weekDaysInfo.map((d) => {
            const isSelected = d.dayName === selectedDayName;
            const isWorkoutDay = workoutDaysSet.has(d.dayName);

            return (
              <button
                key={d.isoDate}
                type="button"
                onClick={() => setSelectedDayName(d.dayName)}
                className={[
                  "rounded-xl px-2 py-3 text-center transition",
                  isSelected
                    ? "bg-blue-600 text-white shadow-md"
                    : "bg-transparent text-slate-700 hover:bg-white",
                ].join(" ")}
              >
                <p className="text-xs font-semibold tracking-wide opacity-90">
                  {d.dayName.slice(0, 3).toUpperCase()}
                </p>
                <p className="mt-1 text-sm font-medium">{d.dateLabel}</p>

                <div className="mt-2 flex items-center justify-center">
                  {isWorkoutDay ? (
                    <span
                      className={[
                        "h-2 w-2 rounded-full",
                        isSelected ? "bg-emerald-300" : "bg-emerald-400",
                      ].join(" ")}
                    />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-transparent" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Workout */}
      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
          {selectedWorkout?.workoutName ?? "Rest day"}
        </p>

        {/* Subtle loading note (optional) */}
        {demoLoading && exercises.length > 0 && (
          <p className="mt-2 text-xs text-slate-400">Loading saved demos…</p>
        )}

        {/* Exercise list */}
        <div className="mt-3 space-y-3">
          {exercises.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
              No workout scheduled for this day.
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
                >
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-slate-900">
                        {ex.name}
                      </p>
                      {/* tiny indicator only when a link exists */}
                      {hasDemo && (
                        <p className="mt-1 text-[11px] font-medium text-emerald-600">
                          ● Demo saved
                        </p>
                      )}
                    </div>

                    <div className="ml-4 flex items-center gap-3">
                      <p className="text-sm font-medium text-slate-500">
                        {ex.sets} × {ex.reps}
                      </p>
                      {/* subtle affordance, keeps alignment clean */}
                      <span className="text-slate-300">›</span>
                    </div>
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
    </div>
  );
}
