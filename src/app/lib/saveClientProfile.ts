import { supabase } from "./supabaseClient";

// Shape matches what you're sending to openAI
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
  calorieTarget?: number;
  calorie_target: number;
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
    })
    .select("id") // return the new record's id
    .single();

  if (error) {
    console.error("Error saving client profile:", error);
    throw error;
  }

  return data; // { id: 'uuid...' }
}
