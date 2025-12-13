"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; // ⬅️ NEW

import type {
  ClientProfile,
  WeeklySummaryResponse,
  DailyCheckinRow,
  DailyCheckinInsert,
  WeekStats,
  FoodEntryRow,
  FoodEntryInsert,
} from "../lib/types";
import { saveDailyCheckin } from "../lib/saveDailyCheckin";
import { supabase } from "../lib/supabaseClient";
import { getCurrentWeekRange } from "../lib/utils";

// 🔹 Weekday helper for the calendar
const WEEKDAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function getCurrentWeekDays() {
  const today = new Date();
  const dayIndex = today.getDay(); // 0 = Sunday, 6 = Saturday
  const mondayOffset = (dayIndex + 6) % 7; // convert to Monday-based
  const monday = new Date(today);
  monday.setDate(today.getDate() - mondayOffset);

  return WEEKDAY_NAMES.map((dayName, index) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + index);
    return {
      dayName,
      dateLabel: d.getDate().toString(), // e.g. "11"
      isToday: d.toDateString() === today.toDateString(),
    };
  });
}

// 🔹 Helper: today's local date in YYYY-MM-DD
function getTodayLocalDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // ⬅️ NEW

  const [weeklySummary, setWeeklySummary] =
    useState<WeeklySummaryResponse | null>(null);

  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const [isCheckinOpen, setIsCheckinOpen] = useState(false);
  const [didWorkoutToday, setDidWorkoutToday] = useState<boolean | null>(null);
  const [hitCaloriesToday, setHitCaloriesToday] = useState<boolean | null>(
    null
  );
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

  // 🔹 FOOD LOGGING STATE
  const [todayMeals, setTodayMeals] = useState<FoodEntryRow[]>([]);
  const [newMealDescription, setNewMealDescription] = useState("");
  const [newMealCalories, setNewMealCalories] = useState("");
  const [newMealType, setNewMealType] = useState("Meal");
  const [mealError, setMealError] = useState<string | null>(null);
  const [mealSaving, setMealSaving] = useState(false);
  const [mealDeletingId, setMealDeletingId] = useState<string | null>(null);

  // 🔹 WORKOUT CALENDAR: selected day of the week
  const [selectedDayName, setSelectedDayName] = useState<string>(() =>
    new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date())
  );

  const todayIso = getTodayLocalDate();

  // 🔹 Reusable: load this week's stats for a given profile
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

  // 🔹 Load profile on mount, then load week stats + today's meals
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

      // 🔹 Week stats
      await loadWeekStats(clientProfile.id);

      // 🔹 Today's meals
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
    // todayIso in dependency so that if the user leaves tab open overnight, it reloads next day
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayIso]);

  // 🔹 FOOD LOGGING HANDLERS

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

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Error logging out:", err);
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

  // 🔹 DAILY CHECK-IN HANDLER

  async function handleSaveTodayCheckin() {
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

    const today = todayIso;

    const payload: DailyCheckinInsert = {
      profile_id: profile.id,
      checkin_date: today,
      did_workout: didWorkoutToday,
      hit_calorie_goal: hitCaloriesToday,
      workout_rating: didWorkoutToday ? workoutRating ?? null : null,
      weight_kg: null,
      notes: checkinNotes || null,
    };

    try {
      await saveDailyCheckin(payload);

      // 🔹 Refresh week stats immediately after saving
      await loadWeekStats(profile.id);

      setCheckinMessage("Today’s check-in saved ✅");
      setIsCheckinOpen(false);

      // Optional: reset modal state
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
  const totalDaysLogged = weekStats.totalCheckins; // currently not shown, but available

  // 🔹 Workout calendar derived data
  const weekDaysInfo = getCurrentWeekDays();
  const workoutDaysSet = new Set(
    (profile?.weekly_workout_schedule ?? []).map(
      (w: any) => w.dayOfWeek as string
    )
  );
  const selectedWorkout =
    profile?.weekly_workout_schedule?.find(
      (w: any) => w.dayOfWeek === selectedDayName
    ) ?? null;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
              <span className="text-sm font-bold">AI</span>
            </div>
            <div className="flex flex-col leading-tight">
              <a
                className="text-base font-semibold tracking-tight md:text-lg"
                href="/"
              >
                Coach<span className="text-blue-600">IE</span>
              </a>
              <span className="text-xs text-slate-500">
                Your AI trainer & nutrition coach
              </span>
            </div>
          </div>

          {profile && (
            <div className="relative flex items-center gap-2 text-sm text-slate-600">
              <span className="hidden text-xs uppercase tracking-wide text-slate-400 md:inline">
                Logged in as
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800">
                {profile.first_name} {profile.last_name}
              </span>

              {/* Settings button */}
              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                aria-label="Open settings"
              >
                {/* Simple gear icon (inline SVG) */}
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.78 1.78 0 0 0 .37 1.95l.06.06a1.5 1.5 0 0 1-2.12 2.12l-.06-.06A1.78 1.78 0 0 0 15 19.4a1.78 1.78 0 0 0-1 .6 1.78 1.78 0 0 0-.37 1.95l.03.07a1.5 1.5 0 1 1-2.8 0l.03-.07A1.78 1.78 0 0 0 9 19.4a1.78 1.78 0 0 0-1.95.37l-.06.06a1.5 1.5 0 1 1-2.12-2.12l.06-.06A1.78 1.78 0 0 0 4.6 15a1.78 1.78 0 0 0-1.95-1l-.07.03a1.5 1.5 0 0 1 0-2.8l.07.03A1.78 1.78 0 0 0 4.6 9a1.78 1.78 0 0 0-.6-1 1.78 1.78 0 0 0-1.95-.37l-.07.03a1.5 1.5 0 1 1 2.8 0l-.03.07A1.78 1.78 0 0 0 9 4.6a1.78 1.78 0 0 0 1-.6 1.78 1.78 0 0 0 .37-1.95l-.03-.07a1.5 1.5 0 1 1 2.8 0l-.03.07A1.78 1.78 0 0 0 15 4.6a1.78 1.78 0 0 0 1.95-.37l.06-.06a1.5 1.5 0 1 1 2.12 2.12l-.06.06A1.78 1.78 0 0 0 19.4 9c.35.94.35 2.06 0 3z" />
                </svg>
              </button>

              {/* Settings dropdown */}
              {isSettingsOpen && (
                <div className="absolute right-0 top-10 w-52 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/80">
                  <div className="border-b border-slate-100 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-700">
                      Account menu
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Manage your CoachIE account
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      router.push("/settings");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span>Account settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsOpen(false);
                      router.push("/billing");
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Billing & payments</span>
                  </button>

                  <div className="border-t border-slate-100" />

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                  >
                    <span>Log out</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main grid */}
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)] md:py-8">
        {/* LEFT: Today */}
        <section className="space-y-6">
          {/* Today Overview + Calories + Meals */}
          <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Today
                </p>
                <h1 className="mt-1 text-xl font-semibold md:text-2xl">
                  {profile
                    ? `Welcome back, ${profile.first_name} 👋`
                    : "Welcome back 👋"}
                </h1>
              </div>
              <p className="text-xs text-slate-500">{todayLabel}</p>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr]">
              {/* Calories summary */}
              <div className="rounded-xl bg-blue-50 p-4 md:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                  Calories
                </p>
                <p className="mt-1 text-xs text-blue-700/70">
                  Remaining = Target - Logged
                </p>

                <div className="mt-4 flex items-center gap-5">
                  <div className="relative h-24 w-24 md:h-28 md:w-28">
                    <div className="absolute inset-0 rounded-full border-[6px] border-blue-100" />
                    <div className="absolute inset-1 rounded-full border-[6px] border-blue-500/80" />
                    <div className="relative flex h-full w-full items-center justify-center">
                      <div className="text-center">
                        <div className="text-lg font-semibold md:text-xl">
                          {caloriesRemaining}
                        </div>
                        <div className="text-[11px] text-blue-700/70">
                          calories left
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 space-y-2 text-xs md:text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Target</span>
                      <span className="font-medium text-slate-900">
                        {calorieTarget}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Logged</span>
                      <span className="text-slate-900">{caloriesLogged}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Remaining</span>
                      <span
                        className={
                          caloriesRemaining >= 0
                            ? "font-medium text-emerald-600"
                            : "font-medium text-amber-600"
                        }
                      >
                        {caloriesRemaining}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              calorieTarget
                                ? (caloriesLogged / calorieTarget) * 100
                                : 0
                            )
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick stats */}
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Workouts this week</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {workoutsThisWeek}
                    <span className="text-sm font-normal text-slate-500">
                      {" "}
                      / {plannedWorkouts}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Logged from Monday through today.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-xs text-slate-500">Days on calories</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {daysHitCalories}
                    <span className="text-sm font-normal text-slate-500">
                      {" "}
                      / {7} days logged
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Only days with a check-in are counted.
                  </p>
                </div>
              </div>
            </div>

            {/* Meals */}
            <div className="mt-4 space-y-3 text-sm">
              {/* Add meal form */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={newMealType}
                  onChange={(e) => setNewMealType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 sm:w-32"
                >
                  <option value="Meal">Meal</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                </select>

                <input
                  type="text"
                  placeholder="e.g. Chicken bowl with rice"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  value={newMealDescription}
                  onChange={(e) => setNewMealDescription(e.target.value)}
                />

                <input
                  type="number"
                  placeholder="cals"
                  className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  value={newMealCalories}
                  onChange={(e) => setNewMealCalories(e.target.value)}
                />

                <button
                  type="button"
                  onClick={handleAddMeal}
                  disabled={mealSaving}
                  className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {mealSaving ? "Adding..." : "Add"}
                </button>
              </div>

              {mealError && (
                <p className="text-xs text-rose-500">{mealError}</p>
              )}

              {/* Meals list */}
              {todayMeals.length > 0 ? (
                <ul className="mt-3 space-y-2 text-xs">
                  {todayMeals.map((meal) => (
                    <li
                      key={meal.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div>
                        <p className="font-medium text-slate-800">
                          {meal.description}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {meal.meal_type || "Meal"} • {meal.calories} kcal
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteMeal(meal.id)}
                        disabled={mealDeletingId === meal.id}
                        className="text-[11px] font-medium text-slate-400 hover:text-rose-600 disabled:cursor-not-allowed"
                      >
                        {mealDeletingId === meal.id ? "Deleting..." : "Delete"}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-xs text-slate-500">
                  No meals logged yet. Start by adding what you eat today – even
                  if it&apos;s not perfect.
                </p>
              )}
            </div>
          </div>

          {/* Weekly workout plan with calendar-style selector */}
          <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold md:text-lg">
                Weekly workout plan
              </h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                {selectedDayName}
              </span>
            </div>

            {/* Calendar row */}
            <div className="mt-4 rounded-xl bg-slate-50 p-2">
              <div className="flex justify-between gap-1">
                {weekDaysInfo.map((day) => {
                  const isSelected = day.dayName === selectedDayName;
                  const hasWorkout = workoutDaysSet.has(day.dayName);

                  return (
                    <button
                      key={day.dayName}
                      type="button"
                      onClick={() => setSelectedDayName(day.dayName)}
                      className={[
                        "flex flex-1 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-[11px] md:px-2 md:py-2 transition",
                        isSelected
                          ? "bg-blue-600 text-white shadow-sm"
                          : day.isToday
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-100",
                      ].join(" ")}
                    >
                      <span className="uppercase tracking-wide">
                        {day.dayName.slice(0, 3)}
                      </span>
                      <span className="text-xs">{day.dateLabel}</span>
                      {hasWorkout && (
                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected day workout */}
            <div className="mt-4">
              {selectedWorkout ? (
                <ul className="space-y-2 text-sm">
                  {selectedWorkout.exercises.map((ex: any) => (
                    <li
                      key={ex.name}
                      className="flex items-baseline justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <span className="font-medium text-slate-800">
                        {ex.name}
                      </span>
                      <span className="text-xs text-slate-500">
                        {ex.sets} × {ex.reps}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">
                  No lifting planned for {selectedDayName}. This can be a rest /
                  steps day or a chance to make up a missed session.
                </p>
              )}
            </div>
            
          </div>

          {/* Daily check-in trigger */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              Log whether you worked out and hit your calories. This powers your
              weekly review.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsCheckinOpen(true);
                setCheckinMessage(null);
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
        <section className="space-y-6">
          {/* This Week (LLM summary) */}
          <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold md:text-lg">This Week</h2>
              <button
                onClick={handleGenerateWeeklySummary}
                disabled={isGeneratingSummary || !profile?.id}
                className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isGeneratingSummary ? "Generating..." : "Generate summary"}
              </button>
            </div>

            {weeklySummary ? (
              <>
                <p className="mt-3 text-sm text-slate-700">
                  {weeklySummary.summary}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="text-slate-500">Days logged</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {weeklySummary.adherence.totalDays}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="text-slate-500">Workouts</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {weeklySummary.adherence.daysWorkedOut}
                    </p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                    <p className="text-slate-500">Calorie days</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {weeklySummary.adherence.daysHitCalories}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs">
                  <p className="font-semibold text-blue-800">
                    Calorie recommendation
                  </p>
                  <p className="mt-1 text-blue-800/90">
                    {weeklySummary.calorieAdjustment.recommendation ===
                      "keep" &&
                      "Keep your current calories – let’s tighten habits first."}
                    {weeklySummary.calorieAdjustment.recommendation ===
                      "lower_slightly" &&
                      "Slightly lower calories – your consistency is strong, and this can help restart progress."}
                    {weeklySummary.calorieAdjustment.recommendation ===
                      "raise_slightly" &&
                      "Slightly raise calories – we may need better recovery and energy for your workouts."}
                  </p>
                  <p className="mt-1 text-[11px] text-blue-700/80">
                    {weeklySummary.calorieAdjustment.explanation}
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-600">
                Once you log a few days, I&apos;ll break down your week here and
                suggest 1–2 simple improvements.
              </p>
            )}
          </div>

          {/* Latest coach message */}
          {weeklySummary && (
            <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
              <h2 className="text-base font-semibold md:text-lg">Your Coach</h2>
              <p className="mt-2 text-sm text-slate-700">
                {weeklySummary.accountabilityMessage}
              </p>
            </div>
          )}

          {/* Your Why */}
          <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
            <h2 className="text-base font-semibold md:text-lg">Your Why</h2>
            <p className="mt-2 text-sm text-slate-700">
              {profile?.goal_why ||
                "We’ll save your main reason for starting this journey here so we can remind you when things get tough."}
            </p>
            {profile?.past_struggles && (
              <p className="mt-3 text-xs text-slate-500">
                Things that usually knock you off track:{" "}
                <span className="font-medium text-slate-700">
                  {profile.past_struggles}
                </span>
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Daily check-in modal */}
      {isCheckinOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-lg md:p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">
                Today&apos;s Check-in
              </h3>
              <button
                type="button"
                onClick={() => setIsCheckinOpen(false)}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <p className="mt-1 text-xs text-slate-500">
              This should take less than a minute. Be honest — it&apos;s here to
              help you, not judge you.
            </p>

            <div className="mt-4 space-y-4 text-sm">
              {/* Did workout? */}
              <div>
                <p className="mb-1 font-medium text-slate-800">
                  Did you work out today?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setDidWorkoutToday(true)}
                    className={
                      "flex-1 rounded-full border px-3 py-1.5 text-sm " +
                      (didWorkoutToday === true
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-700")
                    }
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDidWorkoutToday(false)}
                    className={
                      "flex-1 rounded-full border px-3 py-1.5 text-sm " +
                      (didWorkoutToday === false
                        ? "border-slate-800 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-700")
                    }
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Hit calories? */}
              <div>
                <p className="mb-1 font-medium text-slate-800">
                  Did you stay close to your calorie target?
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHitCaloriesToday(true)}
                    className={
                      "flex-1 rounded-full border px-3 py-1.5 text-sm " +
                      (hitCaloriesToday === true
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700")
                    }
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setHitCaloriesToday(false)}
                    className={
                      "flex-1 rounded-full border px-3 py-1.5 text-sm " +
                      (hitCaloriesToday === false
                        ? "border-amber-600 bg-amber-50 text-amber-700"
                        : "border-slate-200 bg-white text-slate-700")
                    }
                  >
                    No
                  </button>
                </div>
              </div>

              {/* Workout rating (only if didWorkoutToday === true) */}
              {didWorkoutToday === true && (
                <div>
                  <p className="mb-1 font-medium text-slate-800">
                    How would you rate your workout? (1–10)
                  </p>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={workoutRating ?? 7}
                    onChange={(e) => setWorkoutRating(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Rating:{" "}
                    <span className="font-medium">{workoutRating ?? 7}</span>
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="mb-1 font-medium text-slate-800">
                  Any quick notes about today?
                </p>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  placeholder="Example: Ate out for lunch, felt low energy at the gym..."
                  value={checkinNotes}
                  onChange={(e) => setCheckinNotes(e.target.value)}
                />
              </div>
            </div>

            {checkinMessage && (
              <p className="mt-3 text-xs text-slate-500">{checkinMessage}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCheckinOpen(false)}
                className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTodayCheckin}
                disabled={checkinLoading}
                className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {checkinLoading ? "Saving..." : "Save check-in"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
