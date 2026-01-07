// lib/saveClientProfile.ts
import { supabase } from "./supabaseClient";

// Shape matches what you're sending to OpenAI + DB
export interface ClientProfileInput {
  first_name: string;
  last_name: string;
  age: number;
  gender: "male" | "female" | "other";
  height_cm: number;
  weight_kg: number;
  goalType: string; // or GoalType
  goalWeight_kg: number;
  currentWorkoutsPerWeek: number;
  realisticWorkoutsPerWeek: number;
  workSchedule: string;
  preferredWorkoutTime: string;
  equipment: "none" | "home_gym" | "commercial_gym";
  estimatedSteps: string;

  // calories
  calorieTarget?: number;
  calorie_target: number;

  // 🆕 contact + SMS fields
  phone_number?: string | null;
  email?: string | null;
  consent_to_call?: boolean;
  allow_sms_checkins?: boolean;
  sms_phone_number?: string | null;
  timezone?: string | null;
}

export async function saveClientProfile(
  profile: ClientProfileInput,
  userId: string
) {
  const { data, error } = await supabase
    .from("client_profiles")
    .insert({
      user_id: userId,
      first_name: profile.first_name,
      last_name: profile.last_name,
      age: profile.age,
      gender: profile.gender,
      height_cm: profile.height_cm,
      weight_kg: profile.weight_kg,

      calorie_target: profile.calorie_target,

      goal_type: profile.goalType,
      goal_weight_kg: profile.goalWeight_kg,
      current_workouts_per_week: profile.currentWorkoutsPerWeek,
      realistic_workouts_per_week: profile.realisticWorkoutsPerWeek,
      work_schedule: profile.workSchedule,
      preferred_workout_time: profile.preferredWorkoutTime,
      equipment: profile.equipment,
      estimated_steps: profile.estimatedSteps,

      // 🆕 these map directly to the columns in your screenshot
      phone_number: profile.phone_number ?? null,
      email: profile.email ?? null,
      consent_to_call: profile.consent_to_call ?? false,
      allow_sms_checkins: profile.allow_sms_checkins ?? false,
      sms_phone_number: profile.sms_phone_number ?? null,
      timezone: profile.timezone ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error saving client profile:", error);
    throw error;
  }

  return data; // { id: 'uuid...' }
}
