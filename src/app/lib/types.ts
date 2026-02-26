// lib/types.ts

// ──────────────────────────
// Goals & macros
// ──────────────────────────

export type GoalType = "lose_weight" | "gain_muscle" | "recomp";

export interface MacroTargets {
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
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
  age: string; // you can later switch this to number if you want
  gender: "male" | "female" | "other";
  height_cm: string;
  weight_kg: string;
  goalType: GoalType;
  goalWeight_kg: string;
  calorie_target: number | null;
  protein_target: number | null;
  carbs_target: number | null;
  fat_target: number | null;
  currentWorkoutsPerWeek: string;
  realistic_workouts_per_week: string;
  workSchedule: string;
  preferredWorkoutTime: string;
  equipment: "none" | "home_gym" | "commercial_gym";
  estimatedSteps: string;
  goal_why?: string | null;
  past_struggles?: string | null;
  workout_split?: string[] | null;
  weekly_workout_schedule?: WeeklyWorkoutSession[] | null;

  active_focus_areas?: string[] | null;
  active_plan_notes?: string | null;
  active_focus_updated_at?: string | null;

  // ✅ contact info (now actually used)
  phone_number?: string | null;
  email?: string | null;
  consent_to_call?: boolean | null;

  // ✅ SMS-specific for Twilio
  sms_phone_number?: string | null;
  allow_sms_checkins?: boolean | null;
  sms_checkins_enabled?: boolean | null;

  // ✅ Subscription fields
  subscription_tier?: SubscriptionTier;
  subscription_status?: SubscriptionStatus;
  stripe_customer_id?: string | null;
  trial_used?: boolean;
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
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  created_at: string;
  updated_at: string;
};

export type FoodEntryInsert = {
  profile_id: string;
  entry_date: string;
  meal_type?: string | null;
  description: string;
  calories: number;
  protein_g?: number | null;
  carbs_g?: number | null;
  fat_g?: number | null;
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

export type SmsCheckinStage =
  | "idle"
  | "asked_workout"
  | "asked_calories"
  | "asked_notes"
  | "completed";

export interface SmsCheckinState {
  id: string;
  profile_id: string;
  checkin_date: string; // YYYY-MM-DD
  stage: SmsCheckinStage;
  did_workout: boolean | null;
  hit_calorie_goal: boolean | null;
  notes: string | null;
  last_message_at: string;
}

// ──────────────────────────
// Workout logging
// ──────────────────────────

export type WorkoutLogStatus = "in_progress" | "completed";

export type WorkoutLogRow = {
  id: string;
  profile_id: string;
  workout_date: string;
  day_of_week: string;
  workout_name: string;
  status: WorkoutLogStatus;
  started_at: string;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutLogExerciseRow = {
  id: string;
  workout_log_id: string;
  exercise_name: string;
  planned_sets: number;
  planned_reps: string;
  rest_seconds: number | null;
  notes: string | null;
  is_user_added: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type ExerciseSetLogRow = {
  id: string;
  workout_log_exercise_id: string;
  set_number: number;
  planned_reps: string | null;
  reps_completed: number | null;
  weight_value: number | null;
  weight_unit: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkoutLogExerciseWithSets = WorkoutLogExerciseRow & {
  exercise_set_logs: ExerciseSetLogRow[];
};

export type WorkoutLogWithDetails = WorkoutLogRow & {
  workout_log_exercises: WorkoutLogExerciseWithSets[];
};

export type SetLogUpdate = {
  reps_completed?: number | null;
  weight_value?: number | null;
  is_completed?: boolean;
};

export type AddExercisePayload = {
  exercise_name: string;
  planned_sets: number;
  planned_reps: string;
};

// ──────────────────────────
// Activity logging
// ──────────────────────────

export type ActivityIntensity = "light" | "moderate" | "hard";

export type ActivityLogRow = {
  id: string;
  profile_id: string;
  activity_date: string; // ISO date "YYYY-MM-DD"
  activity_name: string;
  duration_minutes: number;
  intensity: ActivityIntensity;
  notes: string | null;
  created_at: string;
};

export type ActivityLogInsert = {
  profile_id: string;
  activity_date: string;
  activity_name: string;
  duration_minutes: number;
  intensity: ActivityIntensity;
  notes?: string | null;
};

// ──────────────────────────
// Subscription & Billing
// ──────────────────────────

export type SubscriptionTier = "free" | "pro" | "elite";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "grandfathered";

export type BillingInterval = "month" | "year";

export interface Subscription {
  id: string;
  profile_id: string;
  user_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billing_interval: BillingInterval | null;
  current_period_start: string | null;
  current_period_end: string | null;
  trial_start: string | null;
  trial_end: string | null;
  canceled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UsageTracking {
  id: string;
  profile_id: string;
  period_start: string;
  period_end: string;
  ai_photo_analyses_used: number;
  ai_summaries_generated: number;
  ai_workout_feedback_used: number;
  ai_plan_regenerations_used: number;
  ai_coach_calls_used: number;
  created_at: string;
  updated_at: string;
}

export interface TierLimits {
  tier: SubscriptionTier;
  // Metered features (0 = none, -1 = unlimited)
  ai_photo_analyses_per_month: number;
  ai_summaries_per_week: number;
  ai_plan_regenerations_per_month: number;
  ai_coach_calls_per_month: number;
  // Boolean features
  coaching_access: boolean; // Access to coaching tab and cards
  ai_workout_generation: boolean; // AI-generated workouts vs manual only
  ai_workout_feedback: boolean;
  sms_checkins: boolean;
  ads_enabled: boolean;
  data_export: boolean;
  advanced_analytics: boolean;
}

export interface SubscriptionWithUsage {
  subscription: Subscription | null;
  usage: UsageTracking | null;
  limits: TierLimits;
  tier: SubscriptionTier;
  isTrialing: boolean;
  trialDaysRemaining: number;
}

export interface PricingTier {
  id: SubscriptionTier;
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  highlighted?: boolean;
  stripePriceIds: {
    monthly: string;
    annual: string;
  };
}

// ──────────────────────────
// Custom Workouts
// ──────────────────────────

export interface CustomWorkout {
  id: string;
  profile_id: string;
  name: string;
  description: string | null;
  exercises: WorkoutExercise[];
  is_template: boolean;
  estimated_duration_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export type CustomWorkoutInsert = Omit<
  CustomWorkout,
  "id" | "created_at" | "updated_at"
>;

export type CustomWorkoutUpdate = Partial<
  Omit<CustomWorkoutInsert, "profile_id">
>;
