// lib/types.ts

export type GoalType = "lose_weight" | "gain_muscle" | "recomp";

export interface MacroTargets {
  calorieTarget: number;
  // proteinTarget_g: number;
  // carbsTarget_g: number;
  // fatTarget_g: number;
}

export interface ClientProfile {
  first_name: string;
  last_name: string;
  age: string; // keep as string in form, convert to number before sending
  gender: "male" | "female";
  height_cm: string;
  weight_kg: string;
  goalType: GoalType;
  goalWeight_kg: string;
  currentWorkoutsPerWeek: string;
  realisticWorkoutsPerWeek: string;
  workSchedule: string;
  preferredWorkoutTime: string;
  equipment: "none" | "home_gym" | "commercial_gym";
  estimatedSteps: string; // e.g. "9k-10k"
  //   phoneNumber?: string;
  //   email?: string;
  //   consentToCall?: boolean;
}

export interface CallAnswers {
  why: string;
  futureVision: string;
  pastStruggles: string;
  planRealismRating: number;
  notes?: string;
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number | string; // allow e.g. "30-45 sec hold"
  notes?: string;
}

export interface WeeklyWorkoutSession {
  dayOfWeek: string; // "Monday"
  workoutName: string; // "Upper Body A"
  exercises: WorkoutExercise[];
}

export interface InitialPlanResponse {
  planSummary: string;
  calorieTarget: number;
  proteinTarget_g: number;
  workoutsPerWeek: number;
  workoutSplit: string[];
  weeklyWorkoutSchedule: WeeklyWorkoutSession[];
  stepTarget: number;
  goalWhy: string;
  pastStruggles: string;
  toneNotes: string;
}
