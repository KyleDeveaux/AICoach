// src/app/lib/saveDailyCheckin.ts
"use client";

import { supabase } from "./supabaseClient";
import type { DailyCheckinInsert } from "./types";

export async function saveDailyCheckin(input: DailyCheckinInsert) {
  const { data, error } = await supabase
    .from("daily_checkins")
    .upsert(
      {
        profile_id: input.profile_id,
        checkin_date: input.checkin_date,
        did_workout: input.did_workout,
        hit_calorie_goal: input.hit_calorie_goal,
        weight_kg: input.weight_kg ?? null,
        workout_rating: input.workout_rating ?? null,
        notes: input.notes ?? null,
      },
      {
        onConflict: "profile_id,checkin_date",
      }
    )
    .select()
    .single();

  if (error) {
    console.error("Error saving daily check-in:", error);
    throw error;
  }

  return data;
}
