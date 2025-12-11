// lib/types.ts

export type GoalType = "lose_weight" | "gain_muscle" | "recomp";

export interface MacroTargets {
  calorieTarget: number;
  // proteinTarget_g: number;
  // carbsTarget_g: number;
  // fatTarget_g: number;
}

export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number | string; // allow e.g. "30-45 sec hold"
  notes?: string;

  // NEW: hint for GIF / visual
  gifUrl?: string; // if you want AI to give a URL (see caveats below)
  gifSearchTerm?: string; // safer: AI gives a search term like "barbell bench press"
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

  workoutSplit: string[]; // e.g. ["Upper Body A", "Lower Body A", ...]
  weeklyWorkoutSchedule: WeeklyWorkoutSession[];

  stepTarget: number;
  goalWhy: string;
  pastStruggles: string;
  toneNotes: string;
}

export interface ClientProfile {
  id: string;
  first_name: string;
  last_name: string;
  age: string; // keep as string in form, convert to number before sending
  gender: "male" | "female";
  height_cm: string;
  weight_kg: string;
  goalType: GoalType;
  goalWeight_kg: string;
  calorie_target: number | null; // 👈 NEW: matches DB column
  currentWorkoutsPerWeek: string;
  realistic_workouts_per_week: string;
  workSchedule: string;
  preferredWorkoutTime: string;
  equipment: "none" | "home_gym" | "commercial_gym";
  estimatedSteps: string; // e.g. "9k-10k"
  goal_why?: string | null;
  past_struggles?: string | null;
  workout_split?: string[] | null;
  weekly_workout_schedule?: WeeklyWorkoutSession[] | null;
  // contact info (future use)
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

export interface DailyCheckinInsert {
  profile_id: string;
  checkin_date: string; // YYYY-MM-DD
  did_workout: boolean;
  hit_calorie_goal: boolean;
  weight_kg?: number | null;
  workout_rating?: number | null; // 1-5
  notes?: string | null;
}

// DB row for daily_checkins (minimal shape we care about)
export type DailyCheckinRow = {
  id: string;
  profile_id: string;
  checkin_date: string; // ISO date "YYYY-MM-DD"
  did_workout: boolean;
  hit_calorie_goal: boolean;
  weight_kg: number | null;
  workout_rating: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export interface WeeklySummaryResponse {
  summary: string; // main conversational summary for the client

  adherence: {
    totalDays: number;
    daysWorkedOut: number;
    daysHitCalories: number;
    avgWorkoutRating: number | null;
  };

  nextWeekFocus: string[]; // advice for next week
  suggestions: string[];

  accountabilityMessage: string[]; // when user struggles reminding messages

  calorieAdjustment: {
    recommendation: "keep" | "lower_slightly" | "raise_slightly";
    explanation: string;
  };
}

export interface WeekStats {
  totalCheckins: number;
  daysWorkedOut: number;
  daysHitCalories: number;
  avgWorkoutRating: number | null;
};
