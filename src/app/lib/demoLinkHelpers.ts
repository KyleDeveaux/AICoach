"use client";

import { supabase } from "./supabaseClient";

export function normalizeExerciseKey(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

type DemoRow = {
  exercise_key: string;
  url: string;
};

/**
 * Fetch demo link URLs for a list of exercise keys.
 * Returns a map of normalizedKey → url.
 */
export async function fetchDemoLinks(
  profileId: string,
  exerciseKeys: string[]
): Promise<Record<string, string>> {
  if (exerciseKeys.length === 0) return {};

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
  return map;
}

/**
 * Save (upsert) a demo link for an exercise.
 */
export async function saveDemoLink(
  profileId: string,
  exerciseName: string,
  url: string
): Promise<void> {
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
}

/**
 * Remove a demo link for an exercise.
 */
export async function removeDemoLink(
  profileId: string,
  exerciseName: string
): Promise<void> {
  const exercise_key = normalizeExerciseKey(exerciseName);

  const { error } = await supabase
    .from("exercise_demo_links")
    .delete()
    .eq("profile_id", profileId)
    .eq("exercise_key", exercise_key);

  if (error) throw error;
}
