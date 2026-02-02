"use client";

import { supabase } from "./supabaseClient";
import type {
  WorkoutLogWithDetails,
  WorkoutLogExerciseRow,
  ExerciseSetLogRow,
  SetLogUpdate,
  AddExercisePayload,
  WeeklyWorkoutSession,
} from "./types";

/**
 * Fetch all workout logs for a given profile within a date range,
 * including nested exercises and set logs.
 */
export async function fetchWeekWorkoutLogs(
  profileId: string,
  weekStart: string,
  weekEnd: string
): Promise<WorkoutLogWithDetails[]> {
  const { data, error } = await supabase
    .from("workout_logs")
    .select(
      `
      *,
      workout_log_exercises (
        *,
        exercise_set_logs (*)
      )
    `
    )
    .eq("profile_id", profileId)
    .gte("workout_date", weekStart)
    .lte("workout_date", weekEnd)
    .order("workout_date", { ascending: true });

  if (error) throw error;
  return (data ?? []) as WorkoutLogWithDetails[];
}

/**
 * Start a new workout: create workout_log, populate exercises from plan,
 * create empty set logs for each exercise.
 */
export async function startWorkout(
  insert: {
    profile_id: string;
    workout_date: string;
    day_of_week: string;
    workout_name: string;
  },
  plannedExercises: WeeklyWorkoutSession["exercises"]
): Promise<WorkoutLogWithDetails> {
  // 1. Insert the workout_log
  const { data: log, error: logError } = await supabase
    .from("workout_logs")
    .insert(insert)
    .select()
    .single();

  if (logError) throw logError;

  // 2. Insert exercises from the plan (skip if no planned exercises, e.g. rest day)
  if (plannedExercises.length > 0) {
    const exerciseInserts = plannedExercises.map((ex, idx) => ({
      workout_log_id: log.id,
      exercise_name: ex.name,
      planned_sets: ex.sets,
      planned_reps: String(ex.reps),
      rest_seconds: typeof ex.rest_seconds === "number" ? ex.rest_seconds : 60,
      notes: ex.notes || null,
      is_user_added: false,
      sort_order: idx,
    }));

    const { data: exercises, error: exError } = await supabase
      .from("workout_log_exercises")
      .insert(exerciseInserts)
      .select();

    if (exError) throw exError;

    // 3. Insert empty set logs for each exercise
    const setInserts: Array<{
      workout_log_exercise_id: string;
      set_number: number;
      planned_reps: string;
    }> = [];

    for (const ex of exercises as WorkoutLogExerciseRow[]) {
      for (let s = 1; s <= ex.planned_sets; s++) {
        setInserts.push({
          workout_log_exercise_id: ex.id,
          set_number: s,
          planned_reps: ex.planned_reps,
        });
      }
    }

    if (setInserts.length > 0) {
      const { error: setError } = await supabase
        .from("exercise_set_logs")
        .insert(setInserts);

      if (setError) throw setError;
    }
  }

  // 4. Re-fetch the full log with nested data
  const { data: fullLog, error: fetchError } = await supabase
    .from("workout_logs")
    .select(
      `
      *,
      workout_log_exercises (
        *,
        exercise_set_logs (*)
      )
    `
    )
    .eq("id", log.id)
    .single();

  if (fetchError) throw fetchError;
  return fullLog as WorkoutLogWithDetails;
}

/**
 * Update a single set log (reps, weight, completion status).
 */
export async function updateSetLog(
  setLogId: string,
  data: SetLogUpdate
): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.reps_completed !== undefined) {
    updatePayload.reps_completed = data.reps_completed;
  }
  if (data.weight_value !== undefined) {
    updatePayload.weight_value = data.weight_value;
  }
  if (data.is_completed !== undefined) {
    updatePayload.is_completed = data.is_completed;
    updatePayload.completed_at = data.is_completed
      ? new Date().toISOString()
      : null;
  }

  const { error } = await supabase
    .from("exercise_set_logs")
    .update(updatePayload)
    .eq("id", setLogId);

  if (error) throw error;
}

/**
 * Add a user-created exercise to an active workout log.
 * Creates the exercise row + empty set log rows.
 */
export async function addExerciseToLog(
  workoutLogId: string,
  payload: AddExercisePayload,
  sortOrder: number
): Promise<{
  exercise: WorkoutLogExerciseRow;
  sets: ExerciseSetLogRow[];
}> {
  // Insert exercise
  const { data: exercise, error: exError } = await supabase
    .from("workout_log_exercises")
    .insert({
      workout_log_id: workoutLogId,
      exercise_name: payload.exercise_name,
      planned_sets: payload.planned_sets,
      planned_reps: payload.planned_reps,
      is_user_added: true,
      sort_order: sortOrder,
    })
    .select()
    .single();

  if (exError) throw exError;

  // Insert empty set logs
  const setInserts = [];
  for (let s = 1; s <= payload.planned_sets; s++) {
    setInserts.push({
      workout_log_exercise_id: exercise.id,
      set_number: s,
      planned_reps: payload.planned_reps,
    });
  }

  const { data: sets, error: setError } = await supabase
    .from("exercise_set_logs")
    .insert(setInserts)
    .select();

  if (setError) throw setError;

  return {
    exercise: exercise as WorkoutLogExerciseRow,
    sets: (sets ?? []) as ExerciseSetLogRow[],
  };
}

/**
 * Add a new set to an existing exercise during an active workout.
 */
export async function addSetToExercise(
  exerciseLogId: string,
  setNumber: number,
  plannedReps: string
): Promise<ExerciseSetLogRow> {
  const { data, error } = await supabase
    .from("exercise_set_logs")
    .insert({
      workout_log_exercise_id: exerciseLogId,
      set_number: setNumber,
      planned_reps: plannedReps,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ExerciseSetLogRow;
}

/**
 * Delete a set from an exercise during an active workout.
 */
export async function deleteSetFromExercise(
  setLogId: string
): Promise<void> {
  const { error } = await supabase
    .from("exercise_set_logs")
    .delete()
    .eq("id", setLogId);

  if (error) throw error;
}

/**
 * Mark a workout as completed.
 */
export async function completeWorkout(workoutLogId: string): Promise<void> {
  const { error } = await supabase
    .from("workout_logs")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", workoutLogId);

  if (error) throw error;
}
