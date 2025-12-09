"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { saveDailyCheckin } from "../lib/saveDailyCheckin";
import {
  WeeklyWorkoutSession,
  DailyCheckinInsert,
  WeeklySummaryResponse,
} from "../lib/types";

type ClientProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  height_cm: number;
  goal_type: string;
  weight_kg: number;
  goal_weight_kg: number;
  realistic_workouts_per_week: number;
  equipment: string;
  calorie_target: number | null;
  workout_split: string[] | null;
  weekly_workout_schedule: WeeklyWorkoutSession[] | null; // we can type this better:
};

interface WorkoutExercise {
  name: string;
  sets: number;
  reps: number | string;
  notes?: string | null;
  gifUrl?: string | null;
}

interface WeeklySession {
  dayOfWeek: string;
  workoutName: string;
  exercises: WorkoutExercise[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ClientProfileRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [didWorkoutToday, setDidWorkoutToday] = useState<boolean | null>(null);
  const [hitCaloriesToday, setHitCaloriesToday] = useState<boolean | null>(
    null
  );
  const [workoutRating, setWorkoutRating] = useState<number | null>(null);
  const [checkinNotes, setCheckinNotes] = useState("");
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState<string | null>(null);

  const [weeklySummary, setWeeklySummary] =
    useState<WeeklySummaryResponse | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);
  const [weeklyError, setWeeklyError] = useState<string | null>(null);

  function cmToFeetInches(height_cm: number) {
    if (!height_cm || Number.isNaN(height_cm)) return null;

    const totalInches = height_cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const remainingInches = Math.round(totalInches - feet * 12);

    return { feet, inches: remainingInches };
  }

  function kgToLbs(kg: number) {
    if (!kg || Number.isNaN(kg)) return null;
    const lbs = kg * 2.20462;
    return Number(lbs.toFixed(1)); // 1 decimal place, e.g. 197.3
  }

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

    // Today in YYYY-MM-DD (local-ish)
    const today = new Date().toISOString().slice(0, 10);

    const payload: DailyCheckinInsert = {
      profile_id: profile.id,
      checkin_date: today,
      did_workout: didWorkoutToday,
      hit_calorie_goal: hitCaloriesToday,
      // only keep rating if they worked out
      workout_rating: didWorkoutToday ? workoutRating ?? null : null,
      weight_kg: null, // we'll use this on weigh-in day later
      notes: checkinNotes || null,
    };

    try {
      await saveDailyCheckin(payload);
      setCheckinMessage("Today’s check-in saved ✅");
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
    if (!profile?.id) {
      setWeeklyError("Profile not loaded yet.");
      return;
    }

    setWeeklyLoading(true);
    setWeeklyError(null);

    try {
      const res = await fetch("/api/generate-weekly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }

      const data = (await res.json()) as WeeklySummaryResponse;
      setWeeklySummary(data);
    } catch (error: unknown) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : "Failed to generate summary.";
      setWeeklyError(message);
    } finally {
      setWeeklyLoading(false);
    }
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // Not logged in → send to login
        router.push("/login");
        return;
      }

      //   These are the values that are for the DB
      const { data, error } = await supabase
        .from("client_profiles")
        .select(
          `
    id,
    first_name,
    last_name,
    goal_type,
    weight_kg,
    goal_weight_kg,
    realistic_workouts_per_week,
    equipment,
    calorie_target,
    workout_split,
    weekly_workout_schedule
  `
        )
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(error);
        setError("Could not load your profile yet.");
      } else {
        setProfile(data as ClientProfileRow);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="p-6">
        <p>Loading your dashboard...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 space-y-4">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={() => router.push("/onboarding")}
          className="px-4 py-2 rounded bg-black text-white text-sm"
        >
          Go to onboarding
        </button>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="p-6 space-y-4">
        <p>No profile found yet.</p>
        <button
          onClick={() => router.push("/onboarding")}
          className="px-4 py-2 rounded bg-black text-white text-sm"
        >
          Complete onboarding
        </button>
      </main>
    );
  }

  const heightImperial = cmToFeetInches(profile.height_cm);
  const currentWeightLbs = kgToLbs(profile.weight_kg);
  const goalWeightLbs = kgToLbs(profile.goal_weight_kg);

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {profile.first_name} 👋
          </h1>
          <p className="text-sm text-gray-600">
            This is your dashboard. We’ll later show your weekly plan,
            today&apos;s workout, and check-ins here.
          </p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="px-3 py-1 rounded border text-sm"
      >
        Log out
      </button>

      <section className="border rounded p-4 space-y-2 text-sm">
        <h2 className="font-semibold mb-2">Your profile</h2>
        {heightImperial && (
          <p>
            Height:{" "}
            <strong>
              {heightImperial.feet}&apos; {heightImperial.inches}&quot;
            </strong>{" "}
            ({profile.height_cm} cm)
          </p>
        )}

        {currentWeightLbs && (
          <p>
            Current Weight: <strong>{currentWeightLbs} lbs</strong> (
            {profile.weight_kg} kg)
          </p>
        )}

        {goalWeightLbs && (
          <p>
            Goal Weight: <strong>{goalWeightLbs} lbs</strong> (
            {profile.goal_weight_kg} kg)
          </p>
        )}

        <p>
          Goal Type: <strong>{profile.goal_type}</strong>
        </p>

        <p>
          Workouts per week (realistic):{" "}
          <strong>{profile.realistic_workouts_per_week}</strong>
        </p>

        <p>
          Daily calorie target:{" "}
          <strong>{profile.calorie_target ?? "TBD"}</strong>
        </p>

        <p>
          Equipment: <strong>{profile.equipment}</strong>
        </p>
      </section>
      {profile.weekly_workout_schedule && (
        <section className="border rounded p-4 space-y-3 text-sm">
          <h2 className="font-semibold text-base">This Week&apos;s Workouts</h2>
          <ul className="space-y-3">
            {profile.weekly_workout_schedule.map((session: WeeklySession) => (
              <li key={session.dayOfWeek} className="border rounded p-3">
                <p className="font-semibold">
                  {session.dayOfWeek}: {session.workoutName}
                </p>
                <ul className="mt-2 space-y-1">
                  {session.exercises.map((ex) => (
                    <li key={ex.name} className="flex items-start gap-3">
                      <div className="flex-1">
                        <p className="font-medium">
                          {ex.name} — {ex.sets} × {ex.reps}
                        </p>
                        {ex.notes && (
                          <p className="text-xs text-gray-600">{ex.notes}</p>
                        )}
                      </div>

                      {/* Optional GIF if you have a URL */}
                      {ex.gifUrl && (
                        <img
                          src={ex.gifUrl}
                          alt={ex.name}
                          className="w-16 h-16 rounded object-cover border"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Today’s Check-In</h2>
        <p className="text-sm text-slate-300">
          Log how today went so your coach can adjust your plan each week.
        </p>

        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium">Did you work out today?</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDidWorkoutToday(true)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  didWorkoutToday === true
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setDidWorkoutToday(false)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  didWorkoutToday === false
                    ? "bg-rose-500 text-slate-950"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                No
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium">
              Did you stay at or under your calorie target today?
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setHitCaloriesToday(true)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  hitCaloriesToday === true
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                Yes
              </button>
              <button
                type="button"
                onClick={() => setHitCaloriesToday(false)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  hitCaloriesToday === false
                    ? "bg-rose-500 text-slate-950"
                    : "bg-slate-800 text-slate-100"
                }`}
              >
                No
              </button>
            </div>
          </div>

          {didWorkoutToday === true && (
            <div>
              <label className="block text-sm font-medium mb-1">
                How would you rate today’s workout? (1–10)
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={workoutRating ?? ""}
                onChange={(e) =>
                  setWorkoutRating(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                className="w-24 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">
              Notes (optional)
            </label>
            <textarea
              value={checkinNotes}
              onChange={(e) => setCheckinNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm"
              placeholder="Anything important about today? (travel, party, low sleep, etc.)"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveTodayCheckin}
            disabled={checkinLoading}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {checkinLoading ? "Saving..." : "Save Today’s Check-In"}
          </button>

          {checkinMessage && (
            <p className="text-sm text-slate-300">{checkinMessage}</p>
          )}
        </div>
      </section>
      <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">This Week’s Summary</h2>
            <p className="text-sm text-slate-300">
              Get a weekly review based on your check-ins so far.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerateWeeklySummary}
            disabled={weeklyLoading}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-medium text-slate-950 hover:bg-emerald-400 disabled:opacity-60"
          >
            {weeklyLoading ? "Generating..." : "Generate Summary"}
          </button>
        </div>

        {weeklyError && <p className="text-sm text-rose-400">{weeklyError}</p>}

        {weeklySummary && (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed">{weeklySummary.summary}</p>

            <div className="text-sm text-slate-300 space-y-1">
              <p>
                <span className="font-semibold">Adherence:</span>{" "}
                {weeklySummary.adherence.daysWorkedOut}/
                {weeklySummary.adherence.totalDays} days worked out,{" "}
                {weeklySummary.adherence.daysHitCalories}/
                {weeklySummary.adherence.totalDays} days hit calories.
              </p>
              {weeklySummary.adherence.avgWorkoutRating !== null && (
                <p>
                  Avg workout rating:{" "}
                  {weeklySummary.adherence.avgWorkoutRating.toFixed(1)}/10
                </p>
              )}
            </div>
            <div className="rounded-lg bg-slate-800/70 p-3 text-sm text-slate-100">
              <p className="font-semibold mb-1">Calorie recommendation</p>
              <p className="mb-0.5">
                Recommendation:{" "}
                <span className="font-semibold">
                  {weeklySummary.calorieAdjustment.recommendation === "keep" &&
                    "Keep current calories"}
                  {weeklySummary.calorieAdjustment.recommendation ===
                    "lower_slightly" && "Slightly lower calories"}
                  {weeklySummary.calorieAdjustment.recommendation ===
                    "raise_slightly" && "Slightly raise calories"}
                </span>
              </p>
              <p>{weeklySummary.calorieAdjustment.explanation}</p>
            </div>

            {weeklySummary.nextWeekFocus.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">
                  Next week, focus on:
                </p>
                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-0.5">
                  {weeklySummary.nextWeekFocus.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {weeklySummary.suggestions.length > 0 && (
              <div>
                <p className="text-sm font-semibold mb-1">
                  Suggested action steps:
                </p>
                <ul className="list-disc pl-5 text-sm text-slate-300 space-y-0.5">
                  {weeklySummary.suggestions.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg bg-slate-800/70 p-3 text-sm text-slate-100">
              <p className="font-semibold mb-1">Accountability message</p>
              <p>{weeklySummary.accountabilityMessage}</p>
            </div>
          </div>
        )}

        {!weeklySummary && !weeklyLoading && !weeklyError && (
          <p className="text-sm text-slate-400">
            Once you’ve logged a few days of check-ins, generate a summary to
            see how you’re doing.
          </p>
        )}
      </section>
    </main>
  );
}
