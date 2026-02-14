// app/dashboard/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

import type {
  ClientProfile,
  WeeklySummaryResponse,
  DailyCheckinInsert,
  WeekStats,
  FoodEntryRow,
  FoodEntryInsert,
} from "../lib/types";
import { saveDailyCheckin } from "../lib/saveDailyCheckin";
import { supabase } from "../lib/supabaseClient";
import {
  getCurrentWeekRange,
  getCurrentWeekDays,
  getTodayLocalDate,
  getPreviousWeekStart,
  addDaysToDateString,
} from "../lib/utils";

import DailyCheckinModal from "./DailyCheckinModal";
import WeeklyReviewModal from "./WeeklyReviewModal";
import DashboardNav from "./DashboardNav";
import GreetingHeader from "./GreetingHeader";
import TodaysScoreCard from "./TodaysScoreCard";
import YourNextStepCard from "./YourNextStepCard";
import DailyCheckinCard from "./DailyCheckinCard";
import NutritionSummaryCard from "./NutritionSummaryCard";
import TodaysWorkoutCard from "./TodaysWorkoutCard";
import BodyCheckCard from "./BodyCheckCard";
import CoachingCard from "./CoachingCard";
import WeeklyInsightsBar from "./WeeklyInsightsBar";

type WeekDayInfo = {
  dayName: string;
  dateLabel: string;
  isoDate: string;
  isToday?: boolean;
};

function Spinner({
  size = 18,
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

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ClientProfile | null>(null);

  // ✅ NEW: top-level dashboard loader (prevents blank flash)
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);

  const [weeklySummary, setWeeklySummary] =
    useState<WeeklySummaryResponse | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Check-in state
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [didWorkoutToday, setDidWorkoutToday] = useState<boolean | null>(null);
  const [hitCaloriesToday, setHitCaloriesToday] = useState<boolean | null>(
    null
  );
  const [workoutRating, setWorkoutRating] = useState<number | null>(null);
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);
  const [streakCount, setStreakCount] = useState<number>(0);

  // Persisted today's check-in values (survive form reset)
  const [savedTodayWorkout, setSavedTodayWorkout] = useState<boolean | null>(null);
  const [savedTodayCalories, setSavedTodayCalories] = useState<boolean | null>(null);


  const [weekStats, setWeekStats] = useState<WeekStats>({
    totalCheckins: 0,
    daysWorkedOut: 0,
    daysHitCalories: 0,
    avgWorkoutRating: null,
  });

  // WEEKLY REVIEW STATE
  const [isWeeklyReviewOpen, setIsWeeklyReviewOpen] = useState(false);
  const [weeklyWeight, setWeeklyWeight] = useState("");
  const [weeklyEffort, setWeeklyEffort] = useState(7);
  const [weeklyWentWell, setWeeklyWentWell] = useState("");
  const [weeklyGotInTheWay, setWeeklyGotInTheWay] = useState("");
  const [weeklyReviewLoading, setWeeklyReviewLoading] = useState(false);
  const [weeklyReviewError, setWeeklyReviewError] = useState<string | null>(
    null
  );

  // For check-in date selection (today vs backfill)
  const todayIso = getTodayLocalDate();
  const [checkinDate, setCheckinDate] = useState<string>(todayIso);
  const [isBackfillMode, setIsBackfillMode] = useState(false);

  // For gating logic (DB-backed)
  const [hasReviewForReviewWeek, setHasReviewForReviewWeek] = useState(false);
  const [hasActivityInReviewWeek, setHasActivityInReviewWeek] = useState(false);
  const [hasTodayCheckinInReviewWeek, setHasTodayCheckinInReviewWeek] =
    useState(false);
  const [isPreExistingUser, setIsPreExistingUser] = useState(false);

  // FOOD LOGGING STATE
  const [todayMeals, setTodayMeals] = useState<FoodEntryRow[]>([]);
  const [newMealDescription, setNewMealDescription] = useState("");
  const [newMealCalories, setNewMealCalories] = useState("");
  const [newMealType, setNewMealType] = useState("Meal");
  const [mealError, setMealError] = useState<string | null>(null);
  const [mealSaving, setMealSaving] = useState(false);
  const [mealDeletingId, setMealDeletingId] = useState<string | null>(null);

  // BODY CHECK STATE
  const [latestBodyCheckUrl, setLatestBodyCheckUrl] = useState<string | null>(null);
  const [lastBodyCheckDate, setLastBodyCheckDate] = useState<string | null>(null);

  // WORKOUT CALENDAR: selected day of the week (for viewing plan only)
  const [selectedDayName, setSelectedDayName] = useState<string>(() =>
    new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date())
  );

  const { weekStart: currentWeekStart } = getCurrentWeekRange();

  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay(); // 0 = Sunday, 1 = Monday, ...
  const isSunday = dayOfWeek === 0;

  // Week we are reviewing:
  // - Sunday → current week
  // - Monday+ → last week
  const reviewWeekStart = isSunday
    ? currentWeekStart
    : getPreviousWeekStart(currentWeekStart);

  const reviewWeekEnd = isSunday
    ? todayIso
    : addDaysToDateString(reviewWeekStart, 6);

  // Load this week's stats for a given profile
  async function loadWeekStats(profileId: string) {
    const { weekStart, today } = getCurrentWeekRange();

    const { data, error } = await supabase
      .from("daily_checkins")
      .select("did_workout, hit_calorie_goal, workout_rating")
      .eq("profile_id", profileId)
      .gte("checkin_date", weekStart)
      .lte("checkin_date", today);

    if (error) {
      console.error("Error loading week stats:", error);
      return;
    }

    if (!data || data.length === 0) {
      setWeekStats({
        totalCheckins: 0,
        daysWorkedOut: 0,
        daysHitCalories: 0,
        avgWorkoutRating: null,
      });
      return;
    }

    let daysWorkedOut = 0;
    let daysHitCalories = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    for (const row of data) {
      if (row.did_workout) daysWorkedOut++;
      if (row.hit_calorie_goal) daysHitCalories++;
      if (row.workout_rating != null) {
        ratingSum += row.workout_rating;
        ratingCount++;
      }
    }

    setWeekStats({
      totalCheckins: data.length,
      daysWorkedOut,
      daysHitCalories,
      avgWorkoutRating: ratingCount ? ratingSum / ratingCount : null,
    });
  }

  function toNum(value: unknown, fallback: number) {
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function normalizeWorkoutForCard(workout: any) {
    if (!workout) return null;

    return {
      dayOfWeek: String(workout.dayOfWeek ?? ""),
      workoutName: String(workout.workoutName ?? "Workout"),
      exercises: Array.isArray(workout.exercises)
        ? workout.exercises.map((ex: any) => ({
            name: String(ex.name ?? "Exercise"),
            reps: toNum(ex.reps, 10),
            sets: toNum(ex.sets, 3),
            notes: typeof ex.notes === "string" ? ex.notes : null,
            gifUrl: null,
            rest_seconds: toNum(ex.rest_seconds, 60),
            gifSearchTerm:
              typeof ex.gifSearchTerm === "string" && ex.gifSearchTerm.trim()
                ? ex.gifSearchTerm.trim()
                : String(ex.name ?? "").toLowerCase(),
          }))
        : [],
    };
  }

  function shiftIsoDate(iso: string, deltaDays: number) {
    const [y, m, d] = iso.split("-").map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    dt.setDate(dt.getDate() + deltaDays);

    const yyyy = dt.getFullYear();
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  async function loadStreak(profileId: string) {
    // pull a reasonable window (covers long streaks without heavy queries)
    const { data, error } = await supabase
      .from("daily_checkins")
      .select("checkin_date")
      .eq("profile_id", profileId)
      .order("checkin_date", { ascending: false })
      .limit(120);

    if (error) {
      console.error("Error loading streak:", error);
      setStreakCount(0);
      return;
    }

    const dateSet = new Set(
      (data ?? [])
        .map((r: any) => r.checkin_date)
        .filter((x: any) => typeof x === "string")
    );

    // Count consecutive days ending today (or yesterday if today's
    // check-in hasn't been submitted yet). The streak only truly resets
    // when yesterday is also missing a check-in.
    let streak = 0;
    let cursor = todayIso;

    // If today has no check-in yet, start counting from yesterday
    if (!dateSet.has(cursor)) {
      cursor = shiftIsoDate(cursor, -1);
    }

    while (dateSet.has(cursor)) {
      streak++;
      cursor = shiftIsoDate(cursor, -1);
    }

    setStreakCount(streak);
  }

  // Load profile on mount, then week stats + review week info + today's meals
  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      setIsDashboardLoading(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting user:", userError);
          return;
        }
        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("client_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error loading client profile:", error);
          return;
        }

        if (cancelled) return;

        const clientProfile = data as ClientProfile;
        setProfile(clientProfile);

        // Week stats (current week)
        await loadWeekStats(clientProfile.id);
        await loadStreak(clientProfile.id);

        // Weekly review existence for review week
        const { data: reviewData, error: reviewError } = await supabase
          .from("weekly_reviews")
          .select("id")
          .eq("profile_id", clientProfile.id)
          .eq("week_start", reviewWeekStart)
          .maybeSingle();

        if (reviewError && (reviewError as any).code !== "PGRST116") {
          console.error("Error loading weekly review:", reviewError);
        } else if (reviewData) {
          setHasReviewForReviewWeek(true);
        }

        // Activity in review week? + does *today* have a check-in?
        const { data: reviewWeekCheckins, error: reviewWeekCheckinsError } =
          await supabase
            .from("daily_checkins")
            .select("id, checkin_date")
            .eq("profile_id", clientProfile.id)
            .gte("checkin_date", reviewWeekStart)
            .lte("checkin_date", reviewWeekEnd);

        if (reviewWeekCheckinsError) {
          console.error(
            "Error loading review-week checkins:",
            reviewWeekCheckinsError
          );
        } else if (Array.isArray(reviewWeekCheckins)) {
          const anyActivity = reviewWeekCheckins.length > 0;
          setHasActivityInReviewWeek(anyActivity);

          const todayCheckinExists = reviewWeekCheckins.some(
            (row: any) => row.checkin_date === todayIso
          );
          setHasTodayCheckinInReviewWeek(todayCheckinExists);
        } else {
          setHasActivityInReviewWeek(false);
          setHasTodayCheckinInReviewWeek(false);
        }

        // Pre-existing user check: any check-in on or before end of review week
        const { data: historyCheckins, error: historyError } = await supabase
          .from("daily_checkins")
          .select("id")
          .eq("profile_id", clientProfile.id)
          .lte("checkin_date", reviewWeekEnd)
          .limit(1);

        if (historyError) {
          console.error("Error loading historical checkins:", historyError);
        } else {
          setIsPreExistingUser(
            Array.isArray(historyCheckins) && historyCheckins.length > 0
          );
        }

        // Today's check-in (for score persistence)
        const { data: todayCheckin } = await supabase
          .from("daily_checkins")
          .select("did_workout, hit_calorie_goal")
          .eq("profile_id", clientProfile.id)
          .eq("checkin_date", todayIso)
          .maybeSingle();

        if (todayCheckin) {
          setSavedTodayWorkout(todayCheckin.did_workout);
          setSavedTodayCalories(todayCheckin.hit_calorie_goal);
        }

        // Today's meals
        const { data: mealsData, error: mealsError } = await supabase
          .from("food_entries")
          .select("*")
          .eq("profile_id", clientProfile.id)
          .eq("entry_date", todayIso)
          .order("created_at", { ascending: true });

        if (mealsError) {
          console.error("Error loading food entries:", mealsError);
        } else if (mealsData) {
          setTodayMeals(mealsData as FoodEntryRow[]);
        }

        // Latest body check photo
        const { data: bodyCheckData, error: bodyCheckError } = await supabase
          .from("body_checks")
          .select("image_path, created_at")
          .eq("profile_id", clientProfile.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (bodyCheckError) {
          console.error("Error loading latest body check:", bodyCheckError);
        } else if (bodyCheckData?.image_path) {
          setLastBodyCheckDate(bodyCheckData.created_at);
          const { data: signedUrlData } = await supabase.storage
            .from("body-checks")
            .createSignedUrl(bodyCheckData.image_path, 60 * 60);
          if (signedUrlData?.signedUrl) {
            setLatestBodyCheckUrl(signedUrlData.signedUrl);
          }
        }
      } finally {
        if (!cancelled) setIsDashboardLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIso, reviewWeekStart, reviewWeekEnd]);

  // Derived gating logic for weekly review:
  const requiresWeeklyReview = isPreExistingUser && !hasReviewForReviewWeek;

  // Sunday: soft banner only
  const shouldShowWeeklyReviewBanner = isSunday && requiresWeeklyReview;

  // Monday+ (any non-Sunday): hard gate until weekly review is submitted
  const shouldForceWeeklyReview = !isSunday && requiresWeeklyReview;

  // Auto-open weekly review modal on Monday+ if required
  useEffect(() => {
    if (shouldForceWeeklyReview && !isWeeklyReviewOpen) {
      setIsWeeklyReviewOpen(true);
    }
  }, [shouldForceWeeklyReview, isWeeklyReviewOpen]);

  // FOOD LOGGING HANDLERS
  const caloriesLogged = todayMeals.reduce(
    (sum, meal) => sum + (meal.calories ?? 0),
    0
  );

  async function handleAddMeal() {
    if (!profile?.id) {
      setMealError("Profile not loaded yet.");
      return;
    }
    setMealError(null);

    const caloriesNum = Number(newMealCalories);
    if (!newMealDescription || !caloriesNum || caloriesNum <= 0) {
      setMealError("Please enter a description and a valid calorie amount.");
      return;
    }

    const payload: FoodEntryInsert = {
      profile_id: profile.id,
      entry_date: todayIso,
      description: newMealDescription.trim(),
      calories: caloriesNum,
      meal_type: newMealType || null,
    };

    setMealSaving(true);
    try {
      const { data, error } = await supabase
        .from("food_entries")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setTodayMeals((prev) => [...prev, data as FoodEntryRow]);
      setNewMealDescription("");
      setNewMealCalories("");
      setNewMealType("Meal");
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Failed to save meal.";
      setMealError(message);
    } finally {
      setMealSaving(false);
    }
  }

  async function handleDeleteMeal(id: string) {
    if (!profile?.id) return;
    setMealDeletingId(id);
    try {
      const { error } = await supabase
        .from("food_entries")
        .delete()
        .eq("id", id)
        .eq("profile_id", profile.id);

      if (error) throw error;

      setTodayMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setMealDeletingId(null);
    }
  }

  async function handleWeeklyReviewSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setWeeklyReviewError(null);

    if (!profile?.id) {
      setWeeklyReviewError("Profile not loaded yet.");
      return;
    }

    setWeeklyReviewLoading(true);

    try {
      // ✅ Get the logged-in session token from Supabase (client-side)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new Error("You are not logged in. Please log in again.");
      }

      // ✅ IMPORTANT: route no longer accepts profileId. It derives it from the logged-in user.
      const payload = {
        weekStart: reviewWeekStart,
        form: {
          weight_lbs: weeklyWeight ? Number(weeklyWeight) : null,
          effort: weeklyEffort,
          wentWell: weeklyWentWell.trim(),
          gotInTheWay: weeklyGotInTheWay.trim(),
        },
      };

      const res = await fetch("/api/weekly-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
        credentials: "include",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Failed to submit weekly review.");
      }

      // ✅ Your route returns: { analysis, updatedCalorieTarget, updatedWorkoutSchedule }
      if (data.analysis) {
        setWeeklySummary(data.analysis as WeeklySummaryResponse);
      }

      if (typeof data.updatedCalorieTarget === "number") {
        setProfile((prev) =>
          prev ? { ...prev, calorie_target: data.updatedCalorieTarget } : prev
        );
      }

      if (data.updatedWorkoutSchedule) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                weekly_workout_schedule: data.updatedWorkoutSchedule,
              }
            : prev
        );
      }

      setHasReviewForReviewWeek(true);
      setIsWeeklyReviewOpen(false);

      // Reset form UI state
      setWeeklyWeight("");
      setWeeklyEffort(7);
      setWeeklyWentWell("");
      setWeeklyGotInTheWay("");
    } catch (err: unknown) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      setWeeklyReviewError(message);
    } finally {
      setWeeklyReviewLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  }

  async function handleSaveCheckin() {
    if (!profile?.id) {
      setCheckinMessage("Profile not loaded yet.");
      return;
    }

    if (didWorkoutToday === null || hitCaloriesToday === null) {
      setCheckinMessage("Please answer both questions.");
      return;
    }

    setCheckinLoading(true);
    setCheckinMessage(null);

    const dateToSave = checkinDate || todayIso;

    const payload: DailyCheckinInsert = {
      profile_id: profile.id,
      checkin_date: dateToSave,
      did_workout: didWorkoutToday,
      hit_calorie_goal: hitCaloriesToday,
      workout_rating: didWorkoutToday ? workoutRating ?? null : null,
      weight_kg: null,
      notes: checkinNotes || null,
    };

    try {
      await saveDailyCheckin(payload);

      await loadWeekStats(profile.id);
      await loadStreak(profile.id);

      if (dateToSave >= reviewWeekStart && dateToSave <= reviewWeekEnd) {
        setHasActivityInReviewWeek(true);
        if (dateToSave === todayIso) setHasTodayCheckinInReviewWeek(true);
      }

      // Persist today's values for the score card before resetting form
      if (dateToSave === todayIso) {
        setSavedTodayWorkout(didWorkoutToday);
        setSavedTodayCalories(hitCaloriesToday);
      }

      setCheckinMessage("Check-in saved ✅");
      setIsCheckinOpen(false);

      // Only reset form values for backfill saves — keep today's values
      // visible in the locked DailyCheckinCard
      if (dateToSave !== todayIso) {
        setDidWorkoutToday(null);
        setHitCaloriesToday(null);
        setWorkoutRating(null);
        setCheckinNotes("");
      }

      setIsBackfillMode(false);
      setCheckinDate(todayIso);
    } catch (error: unknown) {
      console.error(error);
      const msg =
        error instanceof Error ? error.message : "Failed to save check-in.";
      setCheckinMessage(msg);
    } finally {
      setCheckinLoading(false);
    }
  }

async function handleGenerateWeeklySummary() {
  setIsGeneratingSummary(true);
  try {
    const res = await fetch("/api/generate-weekly-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // ✅ ensure cookies always sent
      body: JSON.stringify({}), // ✅ no profileId anymore
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Failed to generate summary");
    }

    setWeeklySummary(data as WeeklySummaryResponse);
  } catch (err) {
    console.error(err);
  } finally {
    setIsGeneratingSummary(false);
  }
}




  const calorieTarget = profile?.calorie_target ?? 0;
  const proteinTarget = profile?.protein_target ?? 0;
  const carbsTarget = profile?.carbs_target ?? 0;
  const fatTarget = profile?.fat_target ?? 0;

  // Auto-set "hit calorie goal" to No when logged calories exceed the target
  useEffect(() => {
    if (calorieTarget > 0 && caloriesLogged > calorieTarget) {
      setHitCaloriesToday(false);
    }
  }, [caloriesLogged, calorieTarget]);

  const plannedWorkouts = Number(profile?.realistic_workouts_per_week ?? 0);
  const workoutsThisWeek = weekStats.daysWorkedOut;
  const daysHitCalories = weekStats.daysHitCalories;

  const weekDaysInfo = getCurrentWeekDays() as WeekDayInfo[];
  const selectedWorkoutRaw =
    profile?.weekly_workout_schedule?.find(
      (w: any) => w.dayOfWeek === selectedDayName
    ) ?? null;

  const selectedWorkout = normalizeWorkoutForCard(selectedWorkoutRaw);

  const selectedDayInfoForCheckin = weekDaysInfo.find(
    (d) => d.isoDate === checkinDate
  );
  const checkinModalTitle =
    checkinDate === todayIso
      ? "Today’s Check-in"
      : selectedDayInfoForCheckin
      ? `Check-in for ${selectedDayInfoForCheckin.dayName}, ${selectedDayInfoForCheckin.dateLabel}`
      : "Check-in";

  const pastOrTodayDaysThisWeek = weekDaysInfo.filter(
    (d) => d.isoDate <= todayIso
  );
  const canBackfill = pastOrTodayDaysThisWeek.length > 1;

  // Compute today's score for the score card
  // Use form state while filling in, fall back to saved DB values
  const todaysScore = (() => {
    let s = 20; // Steps placeholder
    const workout = didWorkoutToday ?? savedTodayWorkout;
    const calories = hitCaloriesToday ?? savedTodayCalories;
    if (workout === true) s += 40;
    if (calories === true) s += 40;
    return s;
  })();

  // Smart suggestion based on current state
  const hasCheckedInToday = savedTodayWorkout !== null || didWorkoutToday !== null;
  const nextStepSuggestion = !hasCheckedInToday
    ? "Start your day with a quick check-in to track your progress"
    : caloriesLogged === 0
    ? "Great check-in! Now log your first meal to track calories"
    : "You're making progress! Stay consistent and keep going";

  if (isDashboardLoading || !profile) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-6xl items-center justify-center px-4">
          <div className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/80 shadow-xl backdrop-blur-xl">
            <div className="bg-slate-800/50 px-6 py-3">
              <div className="flex items-center gap-3">
                <Spinner size={20} className="text-white" />
                <p className="text-sm font-bold text-white">Loading your dashboard…</p>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="flex gap-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-purple-400/50" style={{ animationDelay: "0ms" }} />
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-400/50" style={{ animationDelay: "150ms" }} />
                <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400/50" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-950 text-white">
      {/* Ambient background glow (matches landing page) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-80 w-80 rounded-full bg-cyan-600/10 blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        <DashboardNav profile={profile} variant="dark" />

        {/* Weekly review banner */}
        {shouldShowWeeklyReviewBanner && (
          <div className="px-4 pt-6">
            <div className="mx-auto max-w-6xl">
              <div className="overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-slate-900/50 shadow-lg backdrop-blur-xl">
                <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-amber-600">
                      <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-400">
                        Weekly reset
                      </p>
                      <p className="mt-2 text-sm font-medium leading-relaxed text-amber-200">
                        {hasTodayCheckinInReviewWeek
                          ? "You logged activity this week, including today. Do a quick weekly review so I can adjust your calories and workouts for next week."
                          : "Before we reset your plan for next week, complete today's (Sunday) daily check-in. Once that's logged, you can run your weekly review and get an updated plan."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsWeeklyReviewOpen(true)}
                    disabled={!hasTodayCheckinInReviewWeek}
                    className={[
                      "rounded-lg px-6 py-3 text-sm font-bold transition-all duration-200",
                      hasTodayCheckinInReviewWeek
                        ? "bg-amber-600 text-white hover:bg-amber-500"
                        : "cursor-not-allowed bg-white/10 text-white/40",
                    ].join(" ")}
                  >
                    Start weekly review
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 md:py-10">
          {/* Greeting */}
          <GreetingHeader
            firstName={profile.first_name ?? ""}
            streakCount={streakCount}
            onOpenWeeklyRecap={handleGenerateWeeklySummary}
          />

          {/* Row 1: Score + Next Step */}
          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <TodaysScoreCard
              didWorkout={didWorkoutToday ?? savedTodayWorkout}
              hitCalories={hitCaloriesToday ?? savedTodayCalories}
              score={todaysScore}
            />
            <YourNextStepCard
              suggestion={nextStepSuggestion}
              coachTip={weeklySummary?.accountabilityMessage ?? null}
              onLogWorkout={() => router.push("/workout")}
              onLogFood={() => {}}
              onQuickCheckin={() => {}}
            />
          </div>

          {/* Row 2: Check-In + Nutrition */}
          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <DailyCheckinCard
              didWorkout={didWorkoutToday}
              setDidWorkout={setDidWorkoutToday}
              hitCalories={hitCaloriesToday}
              setHitCalories={setHitCaloriesToday}
              caloriesExceeded={calorieTarget > 0 && caloriesLogged > calorieTarget}
              workoutRating={workoutRating}
              setWorkoutRating={setWorkoutRating}
              notes={checkinNotes}
              setNotes={setCheckinNotes}
              message={checkinMessage}
              isLoading={checkinLoading}
              onSave={handleSaveCheckin}
              onBackfill={() => {
                setIsBackfillMode(true);
                const lastPastDay =
                  pastOrTodayDaysThisWeek
                    .filter((d) => d.isoDate < todayIso)
                    .slice(-1)[0]?.isoDate ?? todayIso;
                setCheckinDate(lastPastDay);
                setIsCheckinOpen(true);
                setCheckinMessage(null);
                setDidWorkoutToday(null);
                setHitCaloriesToday(null);
                setWorkoutRating(null);
                setCheckinNotes("");
              }}
              canBackfill={canBackfill}
              hasExistingCheckin={savedTodayWorkout !== null}
            />
            <NutritionSummaryCard
              calorieTarget={calorieTarget}
              caloriesLogged={caloriesLogged}
              proteinTarget={proteinTarget}
              carbsTarget={carbsTarget}
              fatTarget={fatTarget}
              todayMeals={todayMeals}
              newMealDescription={newMealDescription}
              setNewMealDescription={setNewMealDescription}
              newMealCalories={newMealCalories}
              setNewMealCalories={setNewMealCalories}
              newMealType={newMealType}
              setNewMealType={setNewMealType}
              mealSaving={mealSaving}
              mealError={mealError}
              onAddMeal={handleAddMeal}
              onDeleteMeal={handleDeleteMeal}
            />
          </div>

          {/* Row 3: Workout + [Body Check, Coaching] */}
          <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
            <TodaysWorkoutCard
              selectedWorkout={selectedWorkout}
              onStartWorkout={() => router.push("/workout")}
              onViewPlan={() => router.push("/workout")}
            />
            <div className="grid gap-6 sm:grid-cols-2">
              <BodyCheckCard lastCheckDate={lastBodyCheckDate} latestPhotoUrl={latestBodyCheckUrl} />
              <CoachingCard smsActive={!!profile} />
            </div>
          </div>

          {/* Row 4: Weekly Insights (full width) */}
          <WeeklyInsightsBar
            workoutsCompleted={workoutsThisWeek}
            workoutsPlanned={plannedWorkouts}
            caloriesHitDays={daysHitCalories}
            coachMessage={weeklySummary?.accountabilityMessage ?? null}
          />
        </div>
      </div>

      {/* Backfill modal */}
      <DailyCheckinModal
        isOpen={isCheckinOpen}
        onClose={() => {
          setIsCheckinOpen(false);
          setIsBackfillMode(false);
          setCheckinDate(todayIso);
        }}
        isBackfillMode={isBackfillMode}
        title={checkinModalTitle}
        backfillDays={pastOrTodayDaysThisWeek}
        checkinDate={checkinDate}
        setCheckinDate={setCheckinDate}
        didWorkout={didWorkoutToday}
        setDidWorkout={(v) => setDidWorkoutToday(v)}
        hitCalories={hitCaloriesToday}
        setHitCalories={(v) => setHitCaloriesToday(v)}
        caloriesExceeded={calorieTarget > 0 && caloriesLogged > calorieTarget}
        workoutRating={workoutRating}
        setWorkoutRating={setWorkoutRating}
        notes={checkinNotes}
        setNotes={setCheckinNotes}
        message={checkinMessage}
        isLoading={checkinLoading}
        onSave={handleSaveCheckin}
        hasExistingCheckin={!isBackfillMode && savedTodayWorkout !== null}
      />

      <WeeklyReviewModal
        isOpen={isWeeklyReviewOpen}
        onClose={() => setIsWeeklyReviewOpen(false)}
        weeklyWeight={weeklyWeight}
        setWeeklyWeight={setWeeklyWeight}
        weeklyEffort={weeklyEffort}
        setWeeklyEffort={setWeeklyEffort}
        weeklyWentWell={weeklyWentWell}
        setWeeklyWentWell={setWeeklyWentWell}
        weeklyGotInTheWay={weeklyGotInTheWay}
        setWeeklyGotInTheWay={setWeeklyGotInTheWay}
        weeklyReviewError={weeklyReviewError}
        weeklyReviewLoading={weeklyReviewLoading}
        onSubmit={handleWeeklyReviewSubmit}
        shouldForceWeeklyReview={shouldForceWeeklyReview}
        isEmptyWeekReview={!hasActivityInReviewWeek}
      />
    </main>
  );
}
