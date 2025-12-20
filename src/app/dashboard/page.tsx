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
import TodayPanel from "./TodayPanel";
import WorkoutPlanCard from "./WorkoutPlanCard";
import RightColumnPanel from "./RightColumnPanel";
import DashboardNav from "./DashboardNav";

type WeekDayInfo = {
  dayName: string;
  dateLabel: string;
  isoDate: string;
  isToday?: boolean;
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [weeklySummary, setWeeklySummary] =
    useState<WeeklySummaryResponse | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Check-in state
  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [didWorkoutToday, setDidWorkoutToday] = useState<boolean | null>(null);
  const [hitCaloriesToday, setHitCaloriesToday] = useState<boolean | null>(null);
  const [workoutRating, setWorkoutRating] = useState<number | null>(null);
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);

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

  // FOOD LOGGING STATE
  const [todayMeals, setTodayMeals] = useState<FoodEntryRow[]>([]);
  const [newMealDescription, setNewMealDescription] = useState("");
  const [newMealCalories, setNewMealCalories] = useState("");
  const [newMealType, setNewMealType] = useState("Meal");
  const [mealError, setMealError] = useState<string | null>(null);
  const [mealSaving, setMealSaving] = useState(false);
  const [mealDeletingId, setMealDeletingId] = useState<string | null>(null);

  // WORKOUT CALENDAR: selected day of the week (for viewing plan only)
  const [selectedDayName, setSelectedDayName] = useState<string>(() =>
    new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date())
  );

  const { weekStart: currentWeekStart } = getCurrentWeekRange();

  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay(); // 0 = Sunday, 1 = Monday, ...
  const isSunday = dayOfWeek === 0;
  const isMondayOrLater = dayOfWeek >= 1;

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

  // Load profile on mount, then week stats + review week info + today's meals
  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        return;
      }
      if (!user) {
        console.warn("No logged in user");
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

      const clientProfile = data as ClientProfile;
      setProfile(clientProfile);

      // Week stats (current week)
      await loadWeekStats(clientProfile.id);

      // Weekly review existence for review week
      const { data: reviewData, error: reviewError } = await supabase
        .from("weekly_reviews")
        .select("id")
        .eq("profile_id", clientProfile.id)
        .eq("week_start", reviewWeekStart)
        .maybeSingle();

      if (reviewError && reviewError.code !== "PGRST116") {
        console.error("Error loading weekly review:", reviewError);
      } else if (reviewData) {
        setHasReviewForReviewWeek(true);
      }

      // Activity in review week?
      const { data: reviewWeekCheckins, error: reviewWeekCheckinsError } =
        await supabase
          .from("daily_checkins")
          .select("id")
          .eq("profile_id", clientProfile.id)
          .gte("checkin_date", reviewWeekStart)
          .lte("checkin_date", reviewWeekEnd);

      if (reviewWeekCheckinsError) {
        console.error(
          "Error loading review-week checkins:",
          reviewWeekCheckinsError
        );
      } else {
        setHasActivityInReviewWeek(
          Array.isArray(reviewWeekCheckins) && reviewWeekCheckins.length > 0
        );
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
    }

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIso, reviewWeekStart, reviewWeekEnd]);

  // Derived gating logic for weekly review
  const requiresWeeklyReview =
    hasActivityInReviewWeek && !hasReviewForReviewWeek;
  const shouldShowWeeklyReviewBanner = isSunday && requiresWeeklyReview;
  const shouldForceWeeklyReview = isMondayOrLater && requiresWeeklyReview;

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

    const payload = {
      profileId: profile.id,
      weekStart: reviewWeekStart,
      form: {
        weight_lbs: weeklyWeight ? Number(weeklyWeight) : null,
        effort: weeklyEffort,
        wentWell: weeklyWentWell.trim(),
        gotInTheWay: weeklyGotInTheWay.trim(),
      },
    };

    try {
      const res = await fetch("/api/weekly-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit weekly review.");
      }

      const data = await res.json();

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

  // DAILY CHECK-IN HANDLER (today or backfill)
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

      setCheckinMessage("Check-in saved ✅");
      setIsCheckinOpen(false);

      setIsBackfillMode(false);
      setCheckinDate(todayIso);
      setDidWorkoutToday(null);
      setHitCaloriesToday(null);
      setWorkoutRating(null);
      setCheckinNotes("");
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
    if (!profile?.id) return;
    setIsGeneratingSummary(true);
    try {
      const res = await fetch("/api/generate-weekly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id }),
      });

      if (!res.ok) {
        console.error("Failed to generate summary");
        return;
      }

      const data = (await res.json()) as WeeklySummaryResponse;
      setWeeklySummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingSummary(false);
    }
  }

  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  const calorieTarget = profile?.calorie_target ?? 0;
  const caloriesRemaining = calorieTarget - caloriesLogged;

  const plannedWorkouts = profile?.realistic_workouts_per_week ?? 0;
  const workoutsThisWeek = weekStats.daysWorkedOut;
  const daysHitCalories = weekStats.daysHitCalories;
  const totalDaysLogged = weekStats.totalCheckins; // available if needed

  // Workout calendar derived data
  const weekDaysInfo = getCurrentWeekDays() as WeekDayInfo[];
  const workoutDaysSet = new Set(
    (profile?.weekly_workout_schedule ?? []).map(
      (w: any) => w.dayOfWeek as string
    )
  );
  const selectedWorkout =
    profile?.weekly_workout_schedule?.find(
      (w: any) => w.dayOfWeek === selectedDayName
    ) ?? null;

  // For check-in modal title
  const selectedDayInfoForCheckin = weekDaysInfo.find(
    (d) => d.isoDate === checkinDate
  );
  const checkinModalTitle =
    checkinDate === todayIso
      ? "Today’s Check-in"
      : selectedDayInfoForCheckin
      ? `Check-in for ${selectedDayInfoForCheckin.dayName}, ${selectedDayInfoForCheckin.dateLabel}`
      : "Check-in";

  // Past or today days in this week (for backfill)
  const pastOrTodayDaysThisWeek = weekDaysInfo.filter(
    (d) => d.isoDate <= todayIso
  );
  const canBackfill = pastOrTodayDaysThisWeek.length > 1;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top nav */}
      <DashboardNav profile={profile} />

      {/* Weekly review banner (Sunday only, soft nudge) */}
      {shouldShowWeeklyReviewBanner && (
        <div className="bg-slate-100">
          <div className="mx-auto max-w-6xl px-4 pt-4 md:pt-6">
            <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm md:flex-row md:items-center md:justify-between md:px-6">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-amber-500" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-700">
                    Weekly review ready
                  </p>
                  <p className="mt-1 text-sm text-amber-900">
                    You logged activity this week. Do a quick review so I can
                    adjust your calories and workouts for next week.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsWeeklyReviewOpen(true)}
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
              >
                Start weekly review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main grid */}
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] md:py-8">
        {/* LEFT: Today */}
        <section className="space-y-6">
          <TodayPanel
            profile={profile}
            todayLabel={todayLabel}
            calorieTarget={calorieTarget}
            caloriesLogged={caloriesLogged}
            caloriesRemaining={caloriesRemaining}
            plannedWorkouts={plannedWorkouts}
            workoutsThisWeek={workoutsThisWeek}
            daysHitCalories={daysHitCalories}
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

          <WorkoutPlanCard
            weekDaysInfo={weekDaysInfo}
            selectedDayName={selectedDayName}
            setSelectedDayName={setSelectedDayName}
            selectedWorkout={selectedWorkout}
            workoutDaysSet={workoutDaysSet}
          />

          {/* Daily check-in trigger + backfill link */}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-slate-600">
                Log whether you worked out and hit your calories. This powers
                your weekly review.
              </p>
              {canBackfill && (
                <button
                  type="button"
                  onClick={() => {
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
                  className="mt-1 text-[11px] font-medium text-blue-600 underline-offset-2 hover:underline"
                >
                  Backfill a missed day this week
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setIsBackfillMode(false);
                setCheckinDate(todayIso);
                setIsCheckinOpen(true);
                setCheckinMessage(null);
                setDidWorkoutToday(null);
                setHitCaloriesToday(null);
                setWorkoutRating(null);
                setCheckinNotes("");
              }}
              className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              Open today&apos;s check-in
            </button>
          </div>

          {checkinMessage && (
            <p className="mt-2 text-xs text-slate-500">{checkinMessage}</p>
          )}
        </section>

        {/* RIGHT: Week & Why */}
        <RightColumnPanel
          weeklySummary={weeklySummary}
          isGeneratingSummary={isGeneratingSummary}
          canGenerate={!!profile?.id}
          onGenerateWeeklySummary={handleGenerateWeeklySummary}
          profile={profile}
        />
      </div>

      {/* Daily check-in modal (today or backfill) */}
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
        workoutRating={workoutRating}
        setWorkoutRating={setWorkoutRating}
        notes={checkinNotes}
        setNotes={setCheckinNotes}
        message={checkinMessage}
        isLoading={checkinLoading}
        onSave={handleSaveCheckin}
      />

      {/* Weekly review modal */}
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
      />
    </main>
  );
}
