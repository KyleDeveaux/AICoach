// app/api/weekly-review/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function stripFences(text: string) {
  return text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getWeekRangeFromWeekStart(weekStart: string) {
  const startDate = new Date(weekStart + "T00:00:00Z");
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return { start: weekStart, end: endDate.toISOString().slice(0, 10) };
}

function defaultDaysForCount(count: number): string[] {
  if (count <= 1) return ["Monday"];
  if (count === 2) return ["Monday", "Thursday"];
  if (count === 3) return ["Monday", "Wednesday", "Friday"];
  if (count === 4) return ["Monday", "Tuesday", "Thursday", "Friday"];
  return ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
}

function extractPreferredDaysFromExisting(
  existing: unknown,
  desiredDays: number
) {
  const schedule = Array.isArray(existing) ? (existing as any[]) : [];
  const days = schedule
    .map((x) => (typeof x?.dayOfWeek === "string" ? x.dayOfWeek : null))
    .filter(Boolean) as string[];

  const unique = Array.from(new Set(days));
  if (unique.length >= desiredDays) return unique.slice(0, desiredDays);
  return defaultDaysForCount(desiredDays);
}

type Exercise = {
  name: string;
  reps: number;
  sets: number;
  notes: string | null;
  gifUrl: string | null;
  rest_seconds: number;
  gifSearchTerm: string;
};

type WorkoutDay = {
  dayOfWeek: string;
  workoutName: string;
  exercises: Exercise[];
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function normalizeExercises(input: unknown): Exercise[] {
  if (!Array.isArray(input)) return [];
  const out: Exercise[] = [];

  for (const raw of input as any[]) {
    const name = typeof raw?.name === "string" ? raw.name.trim() : "";
    if (!name) continue;

    const reps = clamp(Number(raw?.reps ?? 10), 1, 30);
    const sets = clamp(Number(raw?.sets ?? 3), 1, 10);
    const rest = clamp(Number(raw?.rest_seconds ?? 60), 30, 240);
    const notes = typeof raw?.notes === "string" ? raw.notes.trim() : null;

    const gifSearchTerm =
      typeof raw?.gifSearchTerm === "string" && raw.gifSearchTerm.trim()
        ? raw.gifSearchTerm.trim()
        : name.toLowerCase();

    out.push({
      name,
      reps,
      sets,
      notes: notes && notes.length ? notes : null,
      gifUrl: null,
      rest_seconds: rest,
      gifSearchTerm,
    });

    if (out.length >= 12) break;
  }

  return out;
}

function sanitizeScheduleShape(
  modelSchedule: unknown,
  desiredDays: number,
  preferredDays: string[],
  fallbackExisting: WorkoutDay[] | null
): WorkoutDay[] | null {
  if (!Array.isArray(modelSchedule)) return null;

  const mapped: WorkoutDay[] = (modelSchedule as any[])
    .map((raw) => {
      const workoutName =
        typeof raw?.workoutName === "string" ? raw.workoutName.trim() : "";
      const exercises = normalizeExercises(raw?.exercises);

      if (!workoutName || exercises.length === 0) return null;

      return {
        dayOfWeek:
          typeof raw?.dayOfWeek === "string" ? raw.dayOfWeek.trim() : "",
        workoutName,
        exercises,
      };
    })
    .filter(Boolean) as WorkoutDay[];

  if (mapped.length === 0) return null;

  let clampedDays = mapped.slice(0, desiredDays);

  if (clampedDays.length < desiredDays) {
    const fb = fallbackExisting ?? [];
    while (clampedDays.length < desiredDays) {
      const idx = clampedDays.length;
      const pick = fb[idx] ?? fb[fb.length - 1];
      if (pick) clampedDays.push(pick);
      else {
        clampedDays.push({
          dayOfWeek: "",
          workoutName: `Workout ${idx + 1}`,
          exercises: [
            {
              name: "Walking (Zone 2)",
              reps: 20,
              sets: 1,
              notes: "Easy pace. Keep it simple.",
              gifUrl: null,
              rest_seconds: 60,
              gifSearchTerm: "walking",
            },
          ],
        });
      }
    }
  }

  clampedDays = clampedDays.map((d, i) => ({
    ...d,
    dayOfWeek: preferredDays[i] ?? d.dayOfWeek ?? `Day ${i + 1}`,
  }));

  return clampedDays;
}

function deepEqualSchedule(a: unknown, b: unknown) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function applyProgressionNudge(schedule: WorkoutDay[]) {
  return schedule.map((day) => {
    const exercises = [...day.exercises];
    if (exercises.length > 0) {
      exercises[0] = {
        ...exercises[0],
        reps: clamp(exercises[0].reps + 1, 1, 30),
        notes:
          (exercises[0].notes ? exercises[0].notes + " " : "") +
          "Progression: add +1 rep vs last week if form is clean.",
      };
    }
    return { ...day, exercises };
  });
}

/** ---------- CALORIE ENGINE (deterministic) ---------- */

type CalorieRecommendation = "keep" | "lower_slightly" | "raise_slightly";
type WeightPoint = { week_start: string; weight_lbs: number };

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return ms / (1000 * 60 * 60 * 24);
}

function getMinCaloriesByGender(gender: unknown) {
  const g = typeof gender === "string" ? gender.toLowerCase() : "";
  if (g.includes("female") || g === "f") return 1200;
  if (g.includes("male") || g === "m") return 1400;
  return 1300;
}

function inferGoalType(profile: any): "cut" | "gain" | "maintain" {
  const goalType =
    typeof profile?.goal_type === "string"
      ? profile.goal_type.toLowerCase()
      : "";
  if (
    goalType.includes("lose") ||
    goalType.includes("cut") ||
    goalType.includes("fat")
  )
    return "cut";
  if (goalType.includes("gain") || goalType.includes("bulk")) return "gain";
  if (goalType.includes("maint")) return "maintain";

  const goalKg =
    typeof profile?.goal_weight_kg === "number" ? profile.goal_weight_kg : null;
  const currentKg =
    typeof profile?.weight_kg === "number" ? profile.weight_kg : null;

  if (goalKg != null && currentKg != null) {
    if (goalKg < currentKg) return "cut";
    if (goalKg > currentKg) return "gain";
  }
  return "maintain";
}

function computeWeeklyDeltaPct(latest: number, prev: number) {
  return ((latest - prev) / prev) * 100;
}

function chooseCalorieAdjustment(params: {
  profile: any;
  currentTarget: number | null;
  adherence: {
    totalDays: number;
    daysHitCalories: number;
    daysWorkedOut: number;
  };
  weightHistory: WeightPoint[]; // newest -> older
  submittedWeightLbs: number | null;
}) {
  const {
    profile,
    currentTarget,
    adherence,
    weightHistory,
    submittedWeightLbs,
  } = params;

  const goal = inferGoalType(profile);

  // ✅ Stronger floor: you can tune these numbers
  const genderFloor = getMinCaloriesByGender(profile?.gender);
  const hardFloor = Math.max(
    genderFloor,
    1400 // universal safety floor (tune: 1400–1600 depending on your philosophy)
  );

  // If no current target, do nothing
  if (!currentTarget) {
    return {
      recommendation: "keep" as CalorieRecommendation,
      delta: 0,
      proposedTarget: null as number | null,
      reason: "No current calorie target set yet.",
      trendDeltaPct: null as number | null,
    };
  }

  // Adherence gate
  if (adherence.totalDays < 3) {
    return {
      recommendation: "keep" as CalorieRecommendation,
      delta: 0,
      proposedTarget: currentTarget,
      reason:
        "Not enough check-ins this week to adjust calories confidently. Focus on consistency first.",
      trendDeltaPct: null as number | null,
    };
  }

  // Cooldown gate (14 days)
  const lastAdj = profile?.last_calorie_adjustment_at
    ? new Date(profile.last_calorie_adjustment_at)
    : null;
  if (lastAdj && daysBetween(new Date(), lastAdj) < 14) {
    return {
      recommendation: "keep" as CalorieRecommendation,
      delta: 0,
      proposedTarget: currentTarget,
      reason:
        "Calories were adjusted recently; holding steady for 14 days to let the change work.",
      trendDeltaPct: null as number | null,
    };
  }

  // Need weigh-in to adjust
  if (!submittedWeightLbs) {
    return {
      recommendation: "keep" as CalorieRecommendation,
      delta: 0,
      proposedTarget: currentTarget,
      reason:
        "No weigh-in submitted for this review, so calories remain unchanged.",
      trendDeltaPct: null as number | null,
    };
  }

  // Build trend window:
  // weights[0] = this week (submitted)
  // weights[1] = last week
  // weights[2] = two weeks ago
  const weights: number[] = [submittedWeightLbs];
  for (const wp of weightHistory) {
    if (typeof wp.weight_lbs === "number" && Number.isFinite(wp.weight_lbs)) {
      weights.push(wp.weight_lbs);
    }
    if (weights.length >= 3) break;
  }

  // ✅ Require 3 points before ever LOWERING calories
  // (prevents reacting to one week of scale noise)
  const hasTwoWeekTrend = weights.length >= 3;

  const delta1 = computeWeeklyDeltaPct(weights[0], weights[1]); // this vs last
  const delta2 = hasTwoWeekTrend
    ? computeWeeklyDeltaPct(weights[1], weights[2])
    : null;

  const adherenceGood = adherence.daysHitCalories >= 4;

  // Noise + stall logic:
  const NOISE_BAND = 0.4; // +/- 0.4% is “scale noise”
  const STALL_LOW = -0.25;
  const STALL_HIGH = +0.25;

  const isNoise1 = Math.abs(delta1) <= NOISE_BAND;
  const isNoise2 = delta2 != null ? Math.abs(delta2) <= NOISE_BAND : false;

  const isStall1 = delta1 >= STALL_LOW && delta1 <= STALL_HIGH;
  const isStall2 =
    delta2 != null ? delta2 >= STALL_LOW && delta2 <= STALL_HIGH : false;

  const isUp1 = delta1 > NOISE_BAND;
  const isUp2 = delta2 != null ? delta2 > NOISE_BAND : false;

  const isFastLoss = delta1 < -1.0;

  // Adjustment sizes (tune)
  const CUT_DOWN = -150;
  const CUT_UP = +150;

  let rec: CalorieRecommendation = "keep";
  let delta = 0;
  let reason = "Keeping calories steady.";

  // ✅ Only auto-adjust aggressively for CUT
  const isCut = goal === "cut";

  if (!isCut) {
    // Conservative for non-cut goals
    if (adherenceGood && isFastLoss) {
      rec = "raise_slightly";
      delta = CUT_UP;
      reason =
        "Loss is very fast; small increase to support recovery and adherence.";
    } else {
      rec = "keep";
      delta = 0;
      reason =
        "Stable trend for your current goal; keeping calories unchanged.";
    }
  } else {
    // CUT goal rules
    if (!adherenceGood) {
      rec = "keep";
      delta = 0;
      reason =
        "Calories unchanged because adherence wasn’t strong enough—improve consistency before adjusting.";
    } else if (isFastLoss) {
      rec = "raise_slightly";
      delta = CUT_UP;
      reason =
        "You’re losing faster than ~1%/week—slightly raising calories to protect performance and recovery.";
    } else {
      // ✅ LOWER only if we have a 2-week confirmation
      if (!hasTwoWeekTrend) {
        rec = "keep";
        delta = 0;
        reason =
          "Need at least two weeks of weigh-in trend before lowering calories (avoids reacting to scale noise).";
      } else {
        // Two-week confirmation rules:
        // 1) two-week stall with good adherence
        const confirmedStall = isStall1 && isStall2;

        // 2) two-week upward drift with good adherence
        const confirmedUp = isUp1 && isUp2;

        if (confirmedStall) {
          rec = "lower_slightly";
          delta = CUT_DOWN;
          reason =
            "Two-week stall with good adherence—small calorie reduction to restart progress.";
        } else if (confirmedUp) {
          rec = "lower_slightly";
          delta = CUT_DOWN;
          reason =
            "Two consecutive weeks trending upward with good adherence—small reduction to re-establish a deficit.";
        } else {
          // If week-to-week is mixed/noisy, hold steady
          rec = "keep";
          delta = 0;
          reason =
            "Trend looks noisy or inconsistent—holding calories steady and reassessing next week.";
        }
      }
    }
  }

  // ✅ Apply floor clamp + don’t reduce below floor
  const proposed = clamp(currentTarget + delta, hardFloor, 10000);

  // If floor blocks a reduction, just keep
  if (delta < 0 && proposed === currentTarget) {
    return {
      recommendation: "keep" as CalorieRecommendation,
      delta: 0,
      proposedTarget: currentTarget,
      reason: `Calorie floor reached (${hardFloor}). Keeping calories steady.`,
      trendDeltaPct: delta1,
    };
  }

  return {
    recommendation: rec,
    delta: proposed - currentTarget,
    proposedTarget: proposed,
    reason,
    trendDeltaPct: delta1,
  };
}

/** ---------- END CALORIE ENGINE ---------- */

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json(
        { error: "Unauthorized (missing token)" },
        { status: 401 }
      );
    }

    // ✅ user-scoped supabase client (RLS enforced) using the token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: { persistSession: false, autoRefreshToken: false },
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { weekStart, form } = body as {
      weekStart?: string;
      form?: {
        weight_lbs: number | null;
        effort: number;
        wentWell: string;
        gotInTheWay: string;
      };
    };

    if (!weekStart || !form || !isIsoDate(weekStart)) {
      return NextResponse.json(
        { error: "Missing or invalid weekStart / form" },
        { status: 400 }
      );
    }

    // ✅ derive profile from user.id (RLS must allow this select)
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Profile load failed:", profileError);
      return NextResponse.json(
        { error: "Could not load profile" },
        { status: 500 }
      );
    }

    const profileId = profile.id as string;
    const { start: rangeStart, end: rangeEnd } =
      getWeekRangeFromWeekStart(weekStart);

    const [
      { data: checkins, error: checkinsError },
      { data: weightRows, error: weightsError },
      { data: activityLogs, error: activityLogsError },
    ] = await Promise.all([
      supabase
        .from("daily_checkins")
        .select("did_workout, hit_calorie_goal, workout_rating, checkin_date")
        .eq("profile_id", profileId)
        .gte("checkin_date", rangeStart)
        .lte("checkin_date", rangeEnd),
      supabase
        .from("weekly_reviews")
        .select("week_start, weight_lbs")
        .eq("profile_id", profileId)
        .not("weight_lbs", "is", null)
        .order("week_start", { ascending: false })
        .limit(6),
      supabase
        .from("activity_logs")
        .select("activity_date, activity_name, duration_minutes, intensity, notes")
        .eq("profile_id", profileId)
        .gte("activity_date", rangeStart)
        .lte("activity_date", rangeEnd)
        .order("activity_date", { ascending: true }),
    ]);

    if (checkinsError) {
      console.error("Checkins load failed:", checkinsError);
      return NextResponse.json(
        { error: "Could not load check-ins" },
        { status: 500 }
      );
    }
    if (weightsError) console.error("Weights load warning:", weightsError);
    if (activityLogsError) console.error("Activity logs load warning:", activityLogsError);

    const safeCheckins = checkins ?? [];
    const adherence = {
      totalDays: safeCheckins.length,
      daysWorkedOut: safeCheckins.filter((c) => !!c.did_workout).length,
      daysHitCalories: safeCheckins.filter((c) => !!c.hit_calorie_goal).length,
    };

    const safeActivityLogs = activityLogs ?? [];
    const activitySummary = safeActivityLogs.map((a: any) => ({
      date: a.activity_date,
      name: a.activity_name,
      durationMinutes: a.duration_minutes,
      intensity: a.intensity,
      notes: a.notes,
    }));

    const realisticDays = clamp(
      Number(profile.realistic_workouts_per_week ?? 3),
      1,
      5
    );

    const existingSchedule = Array.isArray(profile.weekly_workout_schedule)
      ? (profile.weekly_workout_schedule as WorkoutDay[])
      : null;

    const preferredDays = extractPreferredDaysFromExisting(
      existingSchedule,
      realisticDays
    );

    const activeFocusAreas = Array.isArray((profile as any).active_focus_areas)
      ? ((profile as any).active_focus_areas as string[])
      : null;

    const activePlanNotes =
      typeof (profile as any).active_plan_notes === "string"
        ? ((profile as any).active_plan_notes as string)
        : null;

    const currentTarget: number | null =
      (profile.calorie_target as number | null) ?? null;

    const weightHistory: WeightPoint[] = Array.isArray(weightRows)
      ? (weightRows as any[])
          .map((r) => ({
            week_start: r.week_start as string,
            weight_lbs: Number(r.weight_lbs),
          }))
          .filter((x) => x.week_start && Number.isFinite(x.weight_lbs))
      : [];

    const engine = chooseCalorieAdjustment({
      profile,
      currentTarget,
      adherence,
      weightHistory,
      submittedWeightLbs: form.weight_lbs ?? null,
    });

    let finalCalorieTarget = currentTarget;

    if (
      engine.recommendation !== "keep" &&
      typeof engine.proposedTarget === "number"
    ) {
      const { data: updatedProfile, error: updateError } = await supabase
        .from("client_profiles")
        .update({
          calorie_target: engine.proposedTarget,
          last_calorie_adjustment_at: new Date().toISOString(),
          last_calorie_adjustment_delta: engine.delta,
          last_calorie_adjustment_source: "engine",
          last_calorie_adjustment_reason: engine.reason,
        })
        .eq("id", profileId)
        .select("calorie_target")
        .single();

      if (updateError) console.error("Calorie update failed:", updateError);
      else if (updatedProfile)
        finalCalorieTarget = updatedProfile.calorie_target as number;
    }

    const systemPrompt = `
You are CoachIE — supportive, confident, and practical.

You must generate a weekly workout schedule AND write a weekly summary.

IMPORTANT:
- Calories are auto-adjusted by a deterministic engine.
- You MUST NOT decide calories yourself.
- You MUST echo the engine decision exactly for:
  calorieAdjustment.recommendation
- Your job is to explain it clearly (calorieAdjustment.explanation), based on the engine reason + adherence + trend.

Return ONLY valid JSON with this exact shape (no markdown, no code fences):

{
  "summary": string,
  "adherence": { "totalDays": number, "daysWorkedOut": number, "daysHitCalories": number },
  "calorieAdjustment": { "recommendation": "keep" | "lower_slightly" | "raise_slightly", "explanation": string },
  "accountabilityMessage": string,
  "workoutPlan": {
    "weeklyWorkoutSchedule": [
      {
        "dayOfWeek": "Monday",
        "workoutName": "Upper Body A",
        "exercises": [
          { "name": "Bench Press", "reps": 8, "sets": 4, "notes": "short coach note", "gifUrl": null, "rest_seconds": 60, "gifSearchTerm": "bench press" }
        ]
      }
    ]
  },
  "focusInfluence": {
    "usedActiveFocus": boolean,
    "howItAffectedPlan": ["string"]
  }
}

HARD RULES:
- weeklyWorkoutSchedule length MUST be exactly realistic_workouts_per_week.
- Use these exact dayOfWeek values, in order:
  ${preferredDays.join(", ")}
- Do NOT add training days.
- Keep the same broad split structure as the current schedule, but make at least 2 small changes week-to-week:
  - change 1–2 accessory exercises OR
  - change rep ranges OR
  - add a small focus finisher
- If active body-check focus areas exist, bias accessories/finishers toward those muscles.
- If activityLogs are present, acknowledge non-strength activities (running, swimming, etc.) in your summary. Consider them when assessing overall training load and recovery needs. Do NOT penalize non-planned activities — encourage cross-training when appropriate.
- No medical advice. Don't mention AI or JSON.
`.trim();

    const userPayload = {
      profile: {
        id: profileId,
        age: profile.age,
        gender: profile.gender,
        height_cm: profile.height_cm,
        weight_kg: profile.weight_kg,
        goal_type: profile.goal_type,
        goal_weight_kg: profile.goal_weight_kg,
        equipment: profile.equipment,
        realistic_workouts_per_week: realisticDays,
      },
      adherence,
      weeklyReview: form,
      currentWorkoutSchedule: existingSchedule,
      activeFocus: {
        focusAreas: activeFocusAreas,
        planNotes: activePlanNotes,
        updatedAt: (profile as any).active_focus_updated_at ?? null,
      },
      activityLogs: activitySummary,
      requiredDayOrder: preferredDays,
      calorieEngineDecision: {
        recommendation: engine.recommendation,
        delta: engine.delta,
        reason: engine.reason,
        trendDeltaPct: engine.trendDeltaPct,
        finalTarget: finalCalorieTarget,
      },
    };

    const ai = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    });

    const firstOutput = (ai.output?.[0] as any) ?? null;
    const firstContent = firstOutput?.content?.[0] as
      | { type: string; text?: string }
      | undefined;

    const rawText =
      firstContent?.text && typeof firstContent.text === "string"
        ? firstContent.text
        : "{}";

    let analysis: any;
    try {
      analysis = JSON.parse(stripFences(rawText));
    } catch (err) {
      console.error("AI JSON parse failed:", err, rawText);
      return NextResponse.json(
        { error: "Could not parse AI response" },
        { status: 500 }
      );
    }

    if (!analysis?.calorieAdjustment) analysis.calorieAdjustment = {};
    analysis.calorieAdjustment.recommendation = engine.recommendation;

    const modelSchedule = analysis?.workoutPlan?.weeklyWorkoutSchedule;

    let updatedWorkoutSchedule =
      sanitizeScheduleShape(
        modelSchedule,
        realisticDays,
        preferredDays,
        existingSchedule
      ) ??
      existingSchedule ??
      null;

    if (
      existingSchedule &&
      updatedWorkoutSchedule &&
      deepEqualSchedule(updatedWorkoutSchedule, existingSchedule)
    ) {
      updatedWorkoutSchedule = applyProgressionNudge(updatedWorkoutSchedule);
    }

    if (updatedWorkoutSchedule) {
      const workoutSplit = updatedWorkoutSchedule.map((d) => d.workoutName);
      const { error: wsError } = await supabase
        .from("client_profiles")
        .update({
          weekly_workout_schedule: updatedWorkoutSchedule,
          workout_split: workoutSplit,
        })
        .eq("id", profileId);

      if (wsError) console.error("Workout schedule update failed:", wsError);
    }

    const { error: insertError } = await supabase
      .from("weekly_reviews")
      .insert({
        id: crypto.randomUUID(),
        profile_id: profileId,
        week_start: weekStart,
        weight_lbs: form.weight_lbs ?? null,
        effort: form.effort,
        went_well: form.wentWell,
        got_in_the_way: form.gotInTheWay,
        analysis,
        new_calorie_target: finalCalorieTarget,
      });

    if (insertError) {
      console.error("Weekly review insert failed:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to save weekly review" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analysis,
      updatedCalorieTarget: finalCalorieTarget,
      updatedWorkoutSchedule,
    });
  } catch (err) {
    console.error("Weekly review route crash:", err);
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV === "production"
            ? "Unexpected server error"
            : String(err),
      },
      { status: 500 }
    );
  }
}
