"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import type {
  ClientProfile,
  WeeklyWorkoutSession,
  WorkoutLogWithDetails,
  SetLogUpdate,
  AddExercisePayload,
  WorkoutLogExerciseWithSets,
  ExerciseSetLogRow,
  WorkoutExercise,
  ActivityLogRow,
  ActivityIntensity,
} from "../lib/types";
import {
  getCurrentWeekDays,
  getCurrentWeekRange,
  addDaysToDateString,
} from "../lib/utils";
import {
  fetchWeekWorkoutLogs,
  startWorkout,
  updateSetLog,
  addSetToExercise,
  deleteSetFromExercise,
  addExerciseToLog,
  completeWorkout,
} from "../lib/workoutLogHelpers";
import {
  fetchWeekActivityLogs,
  createActivityLog,
  deleteActivityLog,
} from "../lib/activityLogHelpers";
import {
  fetchDemoLinks,
  saveDemoLink,
  removeDemoLink,
  normalizeExerciseKey,
} from "../lib/demoLinkHelpers";

import DashboardNav from "../dashboard/DashboardNav";
import WeeklyCalendarBar from "./WeeklyCalendarBar";
import WorkoutDayView from "./WorkoutDayView";

type WeekDayInfo = {
  dayName: string;
  dateLabel: string;
  isoDate: string;
  isToday?: boolean;
};

function Spinner({
  size = 20,
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

export default function PlanPage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDayName, setSelectedDayName] = useState<string>(() =>
    new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date())
  );

  const [weekLogs, setWeekLogs] = useState<WorkoutLogWithDetails[]>([]);
  const [isStarting, setIsStarting] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isAddingExercise, setIsAddingExercise] = useState(false);

  // Plan editing state
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [draftWorkout, setDraftWorkout] = useState<WeeklyWorkoutSession | null>(null);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planSaveError, setPlanSaveError] = useState<string | null>(null);

  // Activity logging state
  const [weekActivityLogs, setWeekActivityLogs] = useState<ActivityLogRow[]>([]);
  const [isSavingActivity, setIsSavingActivity] = useState(false);
  const [isDeletingActivityId, setIsDeletingActivityId] = useState<string | null>(null);

  // Exercise demo link state
  const [demoMap, setDemoMap] = useState<Record<string, string>>({});
  const [isDemoSaving, setIsDemoSaving] = useState(false);

  const weekDaysInfo = getCurrentWeekDays() as WeekDayInfo[];
  const { weekStart } = getCurrentWeekRange();
  const weekEnd = addDaysToDateString(weekStart, 6);

  // Get the selected day's ISO date
  const selectedDayInfo = weekDaysInfo.find(
    (d) => d.dayName === selectedDayName
  );
  const selectedDateIso = selectedDayInfo?.isoDate ?? "";

  // Load profile + workout logs
  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("You must be logged in to view your plan.");
          setLoading(false);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("client_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profileError || !profileData) {
          setError("Could not load your profile.");
          setLoading(false);
          return;
        }

        const clientProfile = profileData as ClientProfile;
        setProfile(clientProfile);

        // Fetch workout logs and activity logs for the current week
        const [logs, activityLogs] = await Promise.all([
          fetchWeekWorkoutLogs(clientProfile.id, weekStart, weekEnd),
          fetchWeekActivityLogs(clientProfile.id, weekStart, weekEnd),
        ]);
        setWeekLogs(logs);
        setWeekActivityLogs(activityLogs);
      } catch (err) {
        console.error("Plan page load error:", err);
        setError("Something went wrong loading your plan.");
      } finally {
        setLoading(false);
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derive data from profile
  const schedule = (profile?.weekly_workout_schedule ?? []) as WeeklyWorkoutSession[];
  const workoutDaysSet = new Set(schedule.map((w) => w.dayOfWeek));

  // Find planned workout for selected day
  const plannedWorkout =
    schedule.find((w) => w.dayOfWeek === selectedDayName) ?? null;

  // Find existing log for selected day
  const selectedLog =
    weekLogs.find(
      (l) =>
        l.day_of_week === selectedDayName &&
        l.workout_date === selectedDateIso
    ) ?? null;

  // Filter activity logs for the selected day
  const selectedDayActivities = weekActivityLogs.filter(
    (a) => a.activity_date === selectedDateIso
  );

  // Build log status map for the calendar
  const logStatusMap: Record<string, "not_started" | "in_progress" | "completed"> = {};
  for (const d of weekDaysInfo) {
    const log = weekLogs.find(
      (l) => l.day_of_week === d.dayName && l.workout_date === d.isoDate
    );
    if (log) {
      logStatusMap[d.dayName] = log.status === "completed" ? "completed" : "in_progress";
    } else {
      logStatusMap[d.dayName] = "not_started";
    }
  }

  // Refetch logs
  const refetchLogs = useCallback(async () => {
    if (!profile) return;
    try {
      const [logs, activityLogs] = await Promise.all([
        fetchWeekWorkoutLogs(profile.id, weekStart, weekEnd),
        fetchWeekActivityLogs(profile.id, weekStart, weekEnd),
      ]);
      setWeekLogs(logs);
      setWeekActivityLogs(activityLogs);
    } catch (err) {
      console.error("Failed to refetch logs:", err);
    }
  }, [profile, weekStart, weekEnd]);

  // Start workout handler
  async function handleStartWorkout() {
    if (!profile || isStarting) return;

    setIsStarting(true);
    try {
      const workoutName = plannedWorkout?.workoutName ?? "Custom Workout";
      const exercises = plannedWorkout?.exercises ?? [];

      const newLog = await startWorkout(
        {
          profile_id: profile.id,
          workout_date: selectedDateIso,
          day_of_week: selectedDayName,
          workout_name: workoutName,
        },
        exercises
      );

      setWeekLogs((prev) => [...prev, newLog]);
    } catch (err) {
      console.error("Failed to start workout:", err);
    } finally {
      setIsStarting(false);
    }
  }

  // Complete workout handler
  async function handleCompleteWorkout() {
    if (!selectedLog || isCompleting) return;

    setIsCompleting(true);
    try {
      await completeWorkout(selectedLog.id);
      await refetchLogs();
    } catch (err) {
      console.error("Failed to complete workout:", err);
    } finally {
      setIsCompleting(false);
    }
  }

  // Update set log handler
  async function handleSetUpdate(setLogId: string, data: SetLogUpdate) {
    try {
      await updateSetLog(setLogId, data);

      // Optimistically update local state
      setWeekLogs((prev) =>
        prev.map((log) => ({
          ...log,
          workout_log_exercises: log.workout_log_exercises.map(
            (ex: WorkoutLogExerciseWithSets) => ({
              ...ex,
              exercise_set_logs: ex.exercise_set_logs.map(
                (s: ExerciseSetLogRow) =>
                  s.id === setLogId
                    ? {
                        ...s,
                        ...(data.reps_completed !== undefined && {
                          reps_completed: data.reps_completed,
                        }),
                        ...(data.weight_value !== undefined && {
                          weight_value: data.weight_value,
                        }),
                        ...(data.is_completed !== undefined && {
                          is_completed: data.is_completed,
                          completed_at: data.is_completed
                            ? new Date().toISOString()
                            : null,
                        }),
                      }
                    : s
              ),
            })
          ),
        }))
      );
    } catch (err) {
      console.error("Failed to update set:", err);
    }
  }

  // Add set handler
  async function handleAddSet(exerciseLogId: string) {
    if (!selectedLog) return;

    const exerciseLog = selectedLog.workout_log_exercises.find(
      (ex) => ex.id === exerciseLogId
    );
    if (!exerciseLog) return;

    const currentSets = exerciseLog.exercise_set_logs ?? [];
    const nextSetNumber = currentSets.length > 0
      ? Math.max(...currentSets.map((s) => s.set_number)) + 1
      : 1;

    try {
      await addSetToExercise(
        exerciseLogId,
        nextSetNumber,
        exerciseLog.planned_reps
      );
      await refetchLogs();
    } catch (err) {
      console.error("Failed to add set:", err);
    }
  }

  // Delete set handler
  async function handleDeleteSet(setLogId: string) {
    try {
      await deleteSetFromExercise(setLogId);
      await refetchLogs();
    } catch (err) {
      console.error("Failed to delete set:", err);
    }
  }

  // Add exercise handler
  async function handleAddExercise(exercise: AddExercisePayload) {
    if (!selectedLog) return;

    setIsAddingExercise(true);
    try {
      const currentCount = selectedLog.workout_log_exercises.length;
      await addExerciseToLog(selectedLog.id, exercise, currentCount);
      await refetchLogs();
    } catch (err) {
      console.error("Failed to add exercise:", err);
      throw err; // Re-throw so AddExerciseForm shows error
    } finally {
      setIsAddingExercise(false);
    }
  }

  // Reset edit mode when switching days
  useEffect(() => {
    setIsEditingPlan(false);
    setDraftWorkout(null);
    setPlanSaveError(null);
  }, [selectedDayName]);

  // Load demo links for the selected day's exercises
  useEffect(() => {
    if (!profile) return;

    const plannedNames = (plannedWorkout?.exercises ?? []).map((e) => e.name);
    const logNames = (selectedLog?.workout_log_exercises ?? []).map(
      (e) => e.exercise_name
    );
    const allNames = [...new Set([...plannedNames, ...logNames])];
    const keys = allNames.map(normalizeExerciseKey);

    if (keys.length === 0) {
      setDemoMap({});
      return;
    }

    fetchDemoLinks(profile.id, keys)
      .then(setDemoMap)
      .catch((err) => {
        console.error("Failed to load demo links:", err);
        setDemoMap({});
      });
  }, [profile, selectedDayName, plannedWorkout, selectedLog]);

  // Plan editing handlers
  function handleEnterEditMode() {
    if (!plannedWorkout) return;
    setDraftWorkout(JSON.parse(JSON.stringify(plannedWorkout)));
    setIsEditingPlan(true);
    setPlanSaveError(null);
  }

  function handleCancelEdit() {
    setDraftWorkout(null);
    setIsEditingPlan(false);
    setPlanSaveError(null);
  }

  async function handleSavePlanEdits() {
    if (!profile || !draftWorkout) return;
    setIsSavingPlan(true);
    setPlanSaveError(null);

    try {
      const newSchedule = schedule.map((s) =>
        s.dayOfWeek === selectedDayName ? draftWorkout : s
      );

      const { data, error: updateError } = await supabase
        .from("client_profiles")
        .update({ weekly_workout_schedule: newSchedule })
        .eq("id", profile.id)
        .select()
        .single();

      if (updateError) throw updateError;

      setProfile(data as ClientProfile);
      setDraftWorkout(null);
      setIsEditingPlan(false);
    } catch (err) {
      console.error("Failed to save plan edits:", err);
      setPlanSaveError("Failed to save changes. Please try again.");
    } finally {
      setIsSavingPlan(false);
    }
  }

  function handleUpdateDraftExercise(index: number, updates: Partial<WorkoutExercise>) {
    if (!draftWorkout) return;
    setDraftWorkout({
      ...draftWorkout,
      exercises: draftWorkout.exercises.map((ex, i) =>
        i === index ? { ...ex, ...updates } : ex
      ),
    });
  }

  function handleRemoveDraftExercise(index: number) {
    if (!draftWorkout) return;
    setDraftWorkout({
      ...draftWorkout,
      exercises: draftWorkout.exercises.filter((_, i) => i !== index),
    });
  }

  function handleAddDraftExercise(exercise: WorkoutExercise) {
    if (!draftWorkout) return;
    setDraftWorkout({
      ...draftWorkout,
      exercises: [...draftWorkout.exercises, exercise],
    });
  }

  function handleUpdateDraftWorkoutName(name: string) {
    if (!draftWorkout) return;
    setDraftWorkout({ ...draftWorkout, workoutName: name });
  }

  // Activity log handlers
  async function handleSaveActivity(data: {
    activity_name: string;
    duration_minutes: number;
    intensity: ActivityIntensity;
    notes: string | null;
  }) {
    if (!profile) return;

    setIsSavingActivity(true);
    try {
      const newActivity = await createActivityLog({
        profile_id: profile.id,
        activity_date: selectedDateIso,
        activity_name: data.activity_name,
        duration_minutes: data.duration_minutes,
        intensity: data.intensity,
        notes: data.notes,
      });
      setWeekActivityLogs((prev) => [...prev, newActivity]);
    } catch (err) {
      console.error("Failed to save activity:", err);
      throw err;
    } finally {
      setIsSavingActivity(false);
    }
  }

  async function handleDeleteActivity(activityLogId: string) {
    setIsDeletingActivityId(activityLogId);
    try {
      await deleteActivityLog(activityLogId);
      setWeekActivityLogs((prev) => prev.filter((a) => a.id !== activityLogId));
    } catch (err) {
      console.error("Failed to delete activity:", err);
    } finally {
      setIsDeletingActivityId(null);
    }
  }

  // Demo link handlers
  async function handleSaveDemo(exerciseName: string, url: string) {
    if (!profile) return;
    setIsDemoSaving(true);
    try {
      await saveDemoLink(profile.id, exerciseName, url);
      const key = normalizeExerciseKey(exerciseName);
      setDemoMap((prev) => ({ ...prev, [key]: url }));
    } catch (err) {
      console.error("Failed to save demo link:", err);
      throw err;
    } finally {
      setIsDemoSaving(false);
    }
  }

  async function handleRemoveDemo(exerciseName: string) {
    if (!profile) return;
    setIsDemoSaving(true);
    try {
      await removeDemoLink(profile.id, exerciseName);
      const key = normalizeExerciseKey(exerciseName);
      setDemoMap((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    } catch (err) {
      console.error("Failed to remove demo link:", err);
      throw err;
    } finally {
      setIsDemoSaving(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/80 shadow-xl backdrop-blur-xl">
            <div className="bg-slate-800/50 px-6 py-3">
              <div className="flex items-center gap-3">
                <Spinner size={20} className="text-white" />
                <p className="text-sm font-bold text-white">
                  Loading your workout plan...
                </p>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="flex gap-2">
                <div
                  className="h-2 w-2 animate-pulse rounded-full bg-purple-400/50"
                  style={{ animationDelay: "0ms" }}
                />
                <div
                  className="h-2 w-2 animate-pulse rounded-full bg-blue-400/50"
                  style={{ animationDelay: "150ms" }}
                />
                <div
                  className="h-2 w-2 animate-pulse rounded-full bg-cyan-400/50"
                  style={{ animationDelay: "300ms" }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error || !profile) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-8 py-6 text-center">
            <svg
              className="mx-auto h-8 w-8 text-rose-400"
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
            <p className="mt-3 text-sm font-medium text-rose-300">
              {error ?? "Unable to load your plan."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-950 text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-80 w-80 rounded-full bg-cyan-600/10 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <DashboardNav profile={profile} variant="dark" />

        <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 md:py-10">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold text-white">Workout Plan</h1>
            <p className="mt-1 text-sm text-slate-400">
              Track your workouts and log your progress
            </p>
          </div>

          {/* Weekly calendar */}
          <WeeklyCalendarBar
            weekDaysInfo={weekDaysInfo}
            selectedDayName={selectedDayName}
            onSelectDay={setSelectedDayName}
            workoutDaysSet={workoutDaysSet}
            logStatusMap={logStatusMap}
          />

          {/* Selected day workout */}
          <WorkoutDayView
            selectedDayName={selectedDayName}
            plannedWorkout={plannedWorkout}
            workoutLog={selectedLog}
            onStartWorkout={handleStartWorkout}
            onCompleteWorkout={handleCompleteWorkout}
            onSetUpdate={handleSetUpdate}
            onAddSet={handleAddSet}
            onDeleteSet={handleDeleteSet}
            onAddExercise={handleAddExercise}
            isStarting={isStarting}
            isCompleting={isCompleting}
            isAddingExercise={isAddingExercise}
            isEditingPlan={isEditingPlan}
            draftWorkout={draftWorkout}
            onEnterEditMode={handleEnterEditMode}
            onCancelEdit={handleCancelEdit}
            onSavePlanEdits={handleSavePlanEdits}
            onUpdateDraftExercise={handleUpdateDraftExercise}
            onRemoveDraftExercise={handleRemoveDraftExercise}
            onAddDraftExercise={handleAddDraftExercise}
            onUpdateDraftWorkoutName={handleUpdateDraftWorkoutName}
            isSavingPlan={isSavingPlan}
            planSaveError={planSaveError}
            demoMap={demoMap}
            onSaveDemo={handleSaveDemo}
            onRemoveDemo={handleRemoveDemo}
            isDemoSaving={isDemoSaving}
            activityLogs={selectedDayActivities}
            onSaveActivity={handleSaveActivity}
            onDeleteActivity={handleDeleteActivity}
            isSavingActivity={isSavingActivity}
            isDeletingActivityId={isDeletingActivityId}
          />
        </div>
      </div>
    </main>
  );
}
