// lib/types.ts

// ──────────────────────────
// Goals & macros
// ──────────────────────────

export type GoalType = "lose_weight" | "gain_muscle" | "recomp";

export interface MacroTargets {
  calorieTarget: number;
  // proteinTarget_g: number;
  // carbsTarget_g: number;
  // fatTarget_g: number;
}

// ──────────────────────────
// Workouts
// ──────────────────────────

// Single source of truth for exercises
export interface WorkoutExercise {
  name: string;
  sets: number;
  reps: string; // string so you can use "8–10", "AMRAP", etc.
  rest_seconds: number | string; // allow e.g. "30-45 sec hold"
  notes?: string;

  // Optional hints for GIF / visual
  gifUrl?: string;
  gifSearchTerm?: string;
}

// Stored per-day workout in the profile
export interface WeeklyWorkoutSession {
  dayOfWeek: string; // "Monday"
  workoutName: string; // "Upper Body A"
  exercises: WorkoutExercise[];
}

// Convenient aliases so UI components can use more generic names
export type Exercise = WorkoutExercise;
export type WorkoutDay = WeeklyWorkoutSession;

// Initial AI-generated plan
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

// ──────────────────────────
// Client profile
// ──────────────────────────

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
  calorie_target: number | null; // matches DB column
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
  phone_number?: string | null;
  allow_sms_checkins?: boolean | null;
}

// ──────────────────────────
// Call answers (onboarding)
// ──────────────────────────

export interface CallAnswers {
  why: string;
  futureVision: string;
  pastStruggles: string;
  planRealismRating: number;
  notes?: string;
}

// ──────────────────────────
// Daily check-ins
// ──────────────────────────

export interface DailyCheckinInsert {
  profile_id: string;
  checkin_date: string; // YYYY-MM-DD
  did_workout: boolean;
  hit_calorie_goal: boolean;
  weight_kg?: number | null;
  workout_rating?: number | null; // 1-10 in your UI
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

// ──────────────────────────
// Weekly summaries (LLM)
// ──────────────────────────

export interface WeeklySummaryResponse {
  summary: string; // main conversational summary for the client

  adherence: {
    totalDays: number;
    daysWorkedOut: number;
    daysHitCalories: number;
    avgWorkoutRating: number | null;
  };

  // You can keep these if your /generate-weekly-summary route uses them.
  nextWeekFocus?: string[];
  suggestions?: string[];

  // In your current weekly-review route, this is a single string
  accountabilityMessage: string;

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
}

// ──────────────────────────
// Food logging
// ──────────────────────────

export type FoodEntryRow = {
  id: string;
  profile_id: string;
  entry_date: string; // ISO date "YYYY-MM-DD"
  meal_type: string | null;
  description: string;
  calories: number;
  created_at: string;
  updated_at: string;
};

export type FoodEntryInsert = {
  profile_id: string;
  entry_date: string;
  meal_type?: string | null;
  description: string;
  calories: number;
};

// ──────────────────────────
// Weekly reviews
// ──────────────────────────

export type WeeklyReviewRow = {
  id: string;
  profile_id: string;
  week_start: string; // 'YYYY-MM-DD'
  submitted_at: string;
  weight_kg: number | null;
  perceived_effort: number | null;
  wins: string | null;
  struggles: string | null;
};

export type WeeklyReviewInsert = {
  profile_id: string;
  week_start: string;
  weight_kg: number | null;
  perceived_effort: number | null;
  wins: string | null;
  struggles: string | null;
};

export type WeeklyReviewLLMResponse = {
  weeklySummary: WeeklySummaryResponse;
  updatedProfile: ClientProfile;
};

// ──────────────────────────
// UI props
// ──────────────────────────

export interface TodayPanelProps {
  profile: ClientProfile | null;
  todayLabel: string;
  calorieTarget: number;
  caloriesLogged: number;
  caloriesRemaining: number;
  plannedWorkouts: number;
  workoutsThisWeek: number;
  daysHitCalories: number;
  todayMeals: FoodEntryRow[];
  newMealDescription: string;
  setNewMealDescription: (value: string) => void;
  newMealCalories: string;
  setNewMealCalories: (value: string) => void;
  newMealType: string;
  setNewMealType: (value: string) => void;
  mealSaving: boolean;
  mealError: string | null;
  onAddMeal: () => void;
  onDeleteMeal: (id: string) => void;
}
