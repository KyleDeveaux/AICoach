"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { ClientProfile } from "../lib/types";
import { addDaysToDateString, getTodayLocalDate } from "../lib/utils";

import DashboardNav from "../dashboard/DashboardNav";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type WeeklyReviewRow = {
  week_start: string;
  weight_lbs: number | null;
};

type ChartRow = {
  isoDate: string;
  dateLabel: string;
  actual?: number;
  projected?: number;
};

type ProjectionMode = "rolling" | "from-start";

export default function ProgressPage() {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [weeklyReviews, setWeeklyReviews] = useState<WeeklyReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectionMode, setProjectionMode] =
    useState<ProjectionMode>("rolling");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting user:", userError);
          setError("Could not load user.");
          setLoading(false);
          return;
        }

        if (!user) {
          setError("You must be logged in to view your progress.");
          setLoading(false);
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from("client_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (profileError || !profileData) {
          console.error("Error loading client profile:", profileError);
          setError("Could not load your profile.");
          setLoading(false);
          return;
        }

        const clientProfile = profileData as ClientProfile;
        setProfile(clientProfile);

        const { data: reviewsData, error: reviewsError } = await supabase
          .from("weekly_reviews")
          .select("week_start, weight_lbs")
          .eq("profile_id", clientProfile.id)
          .order("week_start", { ascending: true });

        if (reviewsError) {
          console.error("Error loading weekly reviews:", reviewsError);
          setError("Could not load weekly progress.");
          setLoading(false);
          return;
        }

        setWeeklyReviews((reviewsData || []) as WeeklyReviewRow[]);
      } catch (err: unknown) {
        console.error(err);
        const msg =
          err instanceof Error ? err.message : "Something went wrong.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const chartData = useMemo<ChartRow[]>(() => {
    if (!profile) return [];

    const p: any = profile;

    const startWeightLbs =
      typeof p.weight_kg === "number"
        ? Number((p.weight_kg * 2.20462).toFixed(1))
        : null;

    const goalWeightLbs =
      typeof p.goal_weight_kg === "number"
        ? Number((p.goal_weight_kg * 2.20462).toFixed(1))
        : null;

    const goalType: string = p.goal_type ?? p.goalType ?? "lose_weight";

    let weeklyDelta: number;
    switch (goalType) {
      case "gain_muscle":
        weeklyDelta = 0.5; // gain 0.5 lb/week
        break;
      case "recomp":
        weeklyDelta = 0; // maintain-ish
        break;
      case "lose_weight":
      default:
        weeklyDelta = -1; // lose 1 lb/week
        break;
    }

    const createdAtIso =
      typeof p.created_at === "string" ? p.created_at.slice(0, 10) : null;

    const firstReviewWithWeight = weeklyReviews.find(
      (r) => r.weight_lbs != null
    );

    const startDateIso =
      createdAtIso ||
      firstReviewWithWeight?.week_start ||
      getTodayLocalDate();

    // Build actual points: starting weight + weekly review weights
    const actualPoints: { isoDate: string; weight: number }[] = [];

    if (startWeightLbs != null && startDateIso) {
      actualPoints.push({ isoDate: startDateIso, weight: startWeightLbs });
    }

    for (const r of weeklyReviews) {
      if (r.weight_lbs != null) {
        actualPoints.push({
          isoDate: r.week_start,
          weight: r.weight_lbs,
        });
      }
    }

    // If we don't even have a starting weight, we can't chart
    if (!startWeightLbs || !startDateIso) {
      return [];
    }

    const lastActual =
      actualPoints.length > 0
        ? actualPoints[actualPoints.length - 1]
        : null;
    const lastActualDate = lastActual?.isoDate ?? startDateIso;
    const lastActualWeight = lastActual?.weight ?? startWeightLbs;

    const rowsByIso = new Map<string, ChartRow>();

    const ensureRow = (iso: string): ChartRow => {
      const existing = rowsByIso.get(iso);
      if (existing) return existing;
      const dateObj = new Date(iso);
      const dateLabel = dateObj.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const row: ChartRow = { isoDate: iso, dateLabel };
      rowsByIso.set(iso, row);
      return row;
    };

    // Fill actual series
    for (const pt of actualPoints) {
      const row = ensureRow(pt.isoDate);
      row.actual = pt.weight;
    }

    const addRollingProjection = () => {
      const weeksAheadCount = 16;

      for (let i = 0; i < weeksAheadCount; i++) {
        const weeksAhead = i + 1;
        const iso = addDaysToDateString(lastActualDate, weeksAhead * 7);
        let projected = lastActualWeight + weeklyDelta * weeksAhead;

        if (goalWeightLbs != null) {
          if (weeklyDelta < 0 && projected < goalWeightLbs) {
            projected = goalWeightLbs;
          } else if (weeklyDelta > 0 && projected > goalWeightLbs) {
            projected = goalWeightLbs;
          }
        }

        const row = ensureRow(iso);
        row.projected = projected;
      }
    };

    const addFullJourneyProjection = () => {
      // If no valid goal or weeklyDelta is 0, fall back to a flat 16-week projection
      let weeksNeeded: number | null = null;

      if (
        goalWeightLbs != null &&
        weeklyDelta !== 0 &&
        ((weeklyDelta < 0 && goalWeightLbs < startWeightLbs) ||
          (weeklyDelta > 0 && goalWeightLbs > startWeightLbs))
      ) {
        const totalChange = Math.abs(goalWeightLbs - startWeightLbs);
        weeksNeeded = Math.ceil(totalChange / Math.abs(weeklyDelta));
        weeksNeeded = Math.min(weeksNeeded, 52); // cap to 1 year
      }

      const horizonWeeks = weeksNeeded ?? 16;

      for (let i = 0; i <= horizonWeeks; i++) {
        const iso = addDaysToDateString(startDateIso, i * 7);
        let projected = startWeightLbs + weeklyDelta * i;

        if (goalWeightLbs != null) {
          if (weeklyDelta < 0 && projected < goalWeightLbs) {
            projected = goalWeightLbs;
          } else if (weeklyDelta > 0 && projected > goalWeightLbs) {
            projected = goalWeightLbs;
          }
        }

        const row = ensureRow(iso);
        row.projected = projected;
      }

      // Ensure actual points are still stamped (in case some reviews land beyond the plan horizon)
      for (const pt of actualPoints) {
        const row = ensureRow(pt.isoDate);
        row.actual = pt.weight;
      }
    };

    if (projectionMode === "from-start") {
      addFullJourneyProjection();
    } else {
      addRollingProjection();
    }

    const rows = Array.from(rowsByIso.values()).sort((a, b) =>
      a.isoDate.localeCompare(b.isoDate)
    );

    return rows;
  }, [profile, weeklyReviews, projectionMode]);

  const goalType =
    (profile as any)?.goal_type ?? (profile as any)?.goalType ?? "lose_weight";

  const hasAnyData = chartData.length > 0;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <DashboardNav profile={profile} />

      <div className="mx-auto max-w-5xl px-4 py-6 md:py-8">
        <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              Progress
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track how your weight is changing and compare it to your projected
              plan.
            </p>
          </div>

          {/* Projection mode toggle */}
          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white p-0.5 text-[11px] font-medium text-slate-600 shadow-sm">
            <button
              type="button"
              onClick={() => setProjectionMode("rolling")}
              className={[
                "rounded-full px-3 py-1 transition",
                projectionMode === "rolling"
                  ? "bg-slate-900 text-white"
                  : "bg-transparent text-slate-600",
              ].join(" ")}
            >
              Current 16 weeks
            </button>
            <button
              type="button"
              onClick={() => setProjectionMode("from-start")}
              className={[
                "rounded-full px-3 py-1 transition",
                projectionMode === "from-start"
                  ? "bg-slate-900 text-white"
                  : "bg-transparent text-slate-600",
              ].join(" ")}
            >
              Full journey to goal
            </button>
          </div>
        </div>

        {/* Error / loading */}
        {loading && (
          <p className="mt-6 text-sm text-slate-500">Loading progress…</p>
        )}
        {error && !loading && (
          <p className="mt-6 text-sm text-rose-500">{error}</p>
        )}

        {!loading && !error && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Weight trend
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Dark line = your actual weekly weight. Purple dashed line ={" "}
                  {projectionMode === "rolling"
                    ? "where you’d be over the next 16 weeks if you stayed on your current plan."
                    : "your full projected journey from your starting weight toward your goal."}
                </p>
              </div>
            </div>

            {!hasAnyData ? (
              <p className="mt-6 text-sm text-slate-500">
                Once you complete onboarding and your starting weight is saved,
                I’ll show your projected journey here. Weekly weigh-ins will
                draw your actual progress on top.
              </p>
            ) : (
              <div className="mt-5 h-72 w-full md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dateLabel" />
                    <YAxis
                      tickFormatter={(v) => `${v} lb`}
                      domain={["dataMin - 5", "dataMax + 5"]}
                    />
                    <Tooltip
                      formatter={(value: any, key) =>
                        key === "actual"
                          ? [`${value.toFixed(1)} lb`, "Actual"]
                          : [`${value.toFixed(1)} lb`, "Projected"]
                      }
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.isoDate ?? ""
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#0f172a"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      activeDot={{ r: 5 }}
                      name="Actual weight"
                      connectNulls
                    />
                    <Line
                      type="monotone"
                      dataKey="projected"
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="4 4"
                      dot={false}
                      name="Projected"
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {hasAnyData && (
              <p className="mt-4 text-[11px] text-slate-500">
                Goal focus:{" "}
                {goalType === "gain_muscle"
                  ? "lean muscle gain (slower, steady weight increase)."
                  : goalType === "recomp"
                  ? "body recomposition (scale may stay flatter while muscle and fat shift)."
                  : "fat loss (steady downward trend)."}{" "}
                We’ll keep adjusting your plan as you log more weeks.
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
