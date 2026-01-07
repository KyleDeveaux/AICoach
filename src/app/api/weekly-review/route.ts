// app/api/weekly-review/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

function stripFences(text: string) {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
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

function extractPreferredDaysFromExisting(existing: unknown, desiredDays: number) {
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

  for (const raw of input) {
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

  let clamped = mapped.slice(0, desiredDays);

  // pad if short using existing schedule
  if (clamped.length < desiredDays) {
    const fb = fallbackExisting ?? [];
    while (clamped.length < desiredDays) {
      const idx = clamped.length;
      const pick = fb[idx] ?? fb[fb.length - 1];
      if (pick) clamped.push(pick);
      else {
        clamped.push({
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

  // force exact day order
  clamped = clamped.map((d, i) => ({
    ...d,
    dayOfWeek: preferredDays[i] ?? d.dayOfWeek ?? `Day ${i + 1}`,
  }));

  return clamped;
}

function deepEqualSchedule(a: unknown, b: unknown) {
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

// If model returns identical plan, apply a tiny progression so user can confirm it changed.
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

function lbsFromKg(kg: number) {
  return kg * 2.2046226218;
}

function daysBetween(a: Date, b: Date) {
  const ms = Math.abs(a.getTime() - b.getTime());
  return ms / (1000 * 60 * 60 * 24);
}

function getMinCaloriesByGender(gender: unknown) {
  const g = typeof gender === "string" ? gender.toLowerCase() : "";
  if (g.includes("female") || g === "f") return 1200;
  if (g.includes("male") || g === "m") return 1400;
  return 1300; // unknown/other
}

function inferGoalType(profile: any): "cut" | "gain" | "maintain" {
  const goalType = typeof profile?.goal_type === "string" ? profile.goal_type.toLowerCase() : "";
  if (goalType.includes("lose") || goalType.includes("cut") || goalType.includes("fat")) return "cut";
  if (goalType.includes("gain") || goalType.includes("bulk")) return "gain";
  if (goalType.includes("maint")) return "maintain";

  // fallback: compare goal weight
  const goalKg = typeof profile?.goal_weight_kg === "number" ? profile.goal_weight_kg : null;
  const currentKg = typeof profile?.weight_kg === "number" ? profile.weight_kg : null;

  if (goalKg != null && currentKg != null) {
    if (goalKg < currentKg) return "cut";
    if (goalKg > currentKg) return "gain";
  }
  return "maintain";
}

type WeightPoint = { week_start: string; weight_lbs: number };

function computeWeeklyDeltaPct(latest: number, prev: number) {
  // negative = losing weight
  return ((latest - prev) / prev) * 100;
}

function chooseCalorieAdjustment(params: {
  profile: any;
  currentTarget: number | null;
  adherence: { totalDays: number; daysHitCalories: number; daysWorkedOut: number };
  weightHistory: WeightPoint[]; // newest -> older
  submittedWeightLbs: number | null;
}) {
  const { profile, currentTarget, adherence, weightHistory, submittedWeightLbs } = params;

  const goal = inferGoalType(profile);
  const minCalories = getMinCaloriesByGender(profile?.gender);

  // If no current target, we do nothing (your system likely sets this earlier anyway)
  if (!currentTarget) {
    return {
      recommendation: "keep" as CalorieRecommendation,
      delta: 0,
      proposedTarget: null as number | null,
      reason: "No current calorie target set yet.",
      trendDeltaPct: null as number | null,
    };
  }

  // Adherence gate: don’t adjust if they didn’t track enough
  if (adherence.totalDays < 3) {
    return {
      recommendation: "keep" as CalorieRecommendation,
      delta: 0,
      proposedTarget: currentTarget,
      reason: "Not enough check-ins this week to adjust calories confidently. Focus on consistency first.",
      trendDeltaPct: null as number | null,
    };
  }

  // Cooldown gate (14 days)
  const lastAdj = profile?.last_calorie_adjustment_at ? new Date(profile.last_calorie_adjustment_at) : null;
  if (lastAdj && daysBetween(new Date(), lastAdj) < 14) {
    return {
      recommendation: "keep" as CalorieRecommendation,
      delta: 0,
      proposedTarget: currentTarget,
      reason: "Calories were adjusted recently; holding steady for 14 days to let the change work.",
      trendDeltaPct: null as number | null,
    };
  }

  // If the user didn’t submit weight this week, don’t adjust (avoids random changes)
  if (!submittedWeightLbs) {
    return {
      recommendation: "keep" as CalorieRecommendation,
      delta: 0,
      proposedTarget: currentTarget,
      reason: "No weigh-in submitted for this review, so calories remain unchanged.",
      trendDeltaPct: null as number | null,
    };
  }

  // Build a trend window: latest weight (this submission) + last 2 historical weekly weights if available
  const weights: number[] = [submittedWeightLbs];
  for (const wp of weightHistory) {
    if (typeof wp.weight_lbs === "number" && Number.isFinite(wp.weight_lbs)) {
      weights.push(wp.weight_lbs);
    }
    if (weights.length >= 3) break;
  }

  // Need at least 2 points for a trend
  if (weights.length < 2) {
    return {
      recommendation: "keep" as CalorieRecommendation,
      delta: 0,
      proposedTarget: currentTarget,
      reason: "Need at least two weeks of weigh-ins before adjusting calories.",
      trendDeltaPct: null as number | null,
    };
  }

  const delta1 = computeWeeklyDeltaPct(weights[0], weights[1]); // latest vs previous (percent)
  const delta2 = weights.length >= 3 ? computeWeeklyDeltaPct(weights[1], weights[2]) : null;

  const adherenceGood = adherence.daysHitCalories >= 4; // simple + effective

  // For now we only auto-adjust aggressively for CUT goals.
  // (Maintain/recomp/gain: conservative changes only)
  const isCut = goal === "cut";

  let rec: CalorieRecommendation = "keep";
  let delta = 0;
  let reason = "Keeping calories steady.";

  if (!isCut) {
    // conservative: only adjust if clearly drifting AND adherence is good
    if (adherenceGood && delta1 > 0.25) {
      rec = "lower_slightly";
      delta = -150;
      reason = "Weight is trending upward; small reduction to bring you back toward your target.";
    } else if (adherenceGood && delta1 < -1.0) {
      rec = "raise_slightly";
      delta = +150;
      reason = "Loss is very fast; small increase to support recovery and adherence.";
    } else {
      rec = "keep";
      delta = 0;
      reason = "Stable trend for your current goal; keeping calories unchanged.";
    }
  } else {
    // CUT logic
    if (!adherenceGood) {
      rec = "keep";
      delta = 0;
      reason = "Calories unchanged because adherence wasn’t strong enough—let’s improve consistency before adjusting.";
    } else if (delta1 < -1.0) {
      rec = "raise_slightly";
      delta = +150;
      reason = "You’re losing faster than ~1%/week—slightly raising calories to protect performance and recovery.";
    } else if (delta1 <= -0.5 && delta1 >= -1.0) {
      rec = "keep";
      delta = 0;
      reason = "Great rate of loss (~0.5–1%/week). Keep calories the same.";
    } else {
      // potential stall zone (0% to -0.25%) for 2 straight weeks
      const inStallBand1 = delta1 <= 0 && delta1 >= -0.25;
      const inStallBand2 = delta2 != null ? delta2 <= 0 && delta2 >= -0.25 : false;

      if (inStallBand1 && inStallBand2) {
        rec = "lower_slightly";
        delta = -150;
        reason = "Weight trend suggests a stall for ~2 weeks with good adherence—small calorie reduction to restart progress.";
      } else if (delta1 > 0.25) {
        rec = "lower_slightly";
        delta = -150;
        reason = "Weight is trending up despite good adherence—small calorie reduction to re-establish a deficit.";
      } else {
        rec = "keep";
        delta = 0;
        reason = "Trend is a bit noisy—holding calories steady and reassessing next week.";
      }
    }
  }

  const proposed = clamp(currentTarget + delta, minCalories, 10000);

  return {
    recommendation: rec,
    delta,
    proposedTarget: proposed,
    reason,
    trendDeltaPct: delta1,
  };
}

/** ---------- END CALORIE ENGINE ---------- */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      profileId,
      weekStart,
      form,
    }: {
      profileId?: string;
      weekStart?: string;
      form?: {
        weight_lbs: number | null;
        effort: number;
        wentWell: string;
        gotInTheWay: string;
      };
    } = body;

    if (!profileId || !weekStart || !form) {
      return NextResponse.json(
        { error: "Missing profileId, weekStart, or form" },
        { status: 400 }
      );
    }

    const { start: rangeStart, end: rangeEnd } =
      getWeekRangeFromWeekStart(weekStart);

    const [
      { data: profile, error: profileError },
      { data: checkins, error: checkinsError },
      { data: weightRows, error: weightsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("client_profiles")
        .select("*")
        .eq("id", profileId)
        .single(),
      supabaseAdmin
        .from("daily_checkins")
        .select("did_workout, hit_calorie_goal, workout_rating, checkin_date")
        .eq("profile_id", profileId)
        .gte("checkin_date", rangeStart)
        .lte("checkin_date", rangeEnd),
      // pull last weekly weigh-ins (excluding this submission; we’ll add it in engine)
      supabaseAdmin
        .from("weekly_reviews")
        .select("week_start, weight_lbs")
        .eq("profile_id", profileId)
        .not("weight_lbs", "is", null)
        .order("week_start", { ascending: false })
        .limit(6),
    ]);

    if (profileError || !profile) {
      console.error("Error loading profile:", profileError);
      return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
    }

    if (checkinsError) {
      console.error("Error loading checkins:", checkinsError);
      return NextResponse.json({ error: "Could not load check-ins" }, { status: 500 });
    }

    if (weightsError) {
      console.error("Error loading weekly weights:", weightsError);
      // Not fatal; we can still continue with no adjustment
    }

    const safeCheckins = checkins ?? [];

    const adherence = {
      totalDays: safeCheckins.length,
      daysWorkedOut: safeCheckins.filter((c) => !!c.did_workout).length,
      daysHitCalories: safeCheckins.filter((c) => !!c.hit_calorie_goal).length,
    };

    const realisticDays = clamp(
      Number((profile as any).realistic_workouts_per_week ?? 3),
      1,
      5
    );

    const existingSchedule = Array.isArray((profile as any).weekly_workout_schedule)
      ? ((profile as any).weekly_workout_schedule as WorkoutDay[])
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

    // ---- CALORIE ENGINE DECISION (deterministic) ----
    const currentTarget: number | null =
      ((profile as any).calorie_target as number | null) ?? null;

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
      weightHistory, // newest -> older
      submittedWeightLbs: form.weight_lbs ?? null,
    });

    let finalCalorieTarget = currentTarget;

    if (engine.recommendation !== "keep" && typeof engine.proposedTarget === "number") {
      // apply update
      const { data: updatedProfile, error: updateError } = await supabaseAdmin
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

      if (updateError) {
        console.error("Error updating calorie_target:", updateError);
      } else if (updatedProfile) {
        finalCalorieTarget = updatedProfile.calorie_target as number;
      }
    }

    console.log("[weekly-review] activeFocusAreas:", activeFocusAreas);
    console.log("[weekly-review] preferredDays:", preferredDays);
    console.log("[weekly-review] calorie engine:", engine);

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
- No medical advice. Don’t mention AI or JSON.
`.trim();

    const userPayload = {
      profile: {
        id: (profile as any).id,
        age: (profile as any).age,
        gender: (profile as any).gender,
        height_cm: (profile as any).height_cm,
        weight_kg: (profile as any).weight_kg,
        goal_type: (profile as any).goal_type,
        goal_weight_kg: (profile as any).goal_weight_kg,
        equipment: (profile as any).equipment,
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
      requiredDayOrder: preferredDays,

      // ✅ engine decision – model must echo recommendation and explain it
      calorieEngineDecision: {
        recommendation: engine.recommendation,
        delta: engine.delta,
        reason: engine.reason,
        trendDeltaPct: engine.trendDeltaPct,
        finalTarget: finalCalorieTarget,
      },
    };

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    });

    const firstOutput = (response.output?.[0] as any) ?? null;
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
      console.error("Failed to parse LLM JSON:", err, rawText);
      return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });
    }

    // ✅ Force calorieAdjustment recommendation to engine decision (no drift)
    if (!analysis?.calorieAdjustment) analysis.calorieAdjustment = {};
    analysis.calorieAdjustment.recommendation = engine.recommendation;

    // ✅ Workout schedule generation + sanitize + enforce day order
    const modelSchedule = analysis?.workoutPlan?.weeklyWorkoutSchedule;

    let updatedWorkoutSchedule =
      sanitizeScheduleShape(modelSchedule, realisticDays, preferredDays, existingSchedule) ??
      existingSchedule ??
      null;

    // If identical to existing, apply a small progression nudge
    if (existingSchedule && updatedWorkoutSchedule && deepEqualSchedule(updatedWorkoutSchedule, existingSchedule)) {
      console.warn("[weekly-review] Model returned identical schedule. Applying progression nudge.");
      updatedWorkoutSchedule = applyProgressionNudge(updatedWorkoutSchedule);
    }

    // Persist schedule & split
    if (updatedWorkoutSchedule) {
      const workoutSplit = updatedWorkoutSchedule.map((d) => d.workoutName);

      const { error: wsError } = await supabaseAdmin
        .from("client_profiles")
        .update({
          weekly_workout_schedule: updatedWorkoutSchedule,
          workout_split: workoutSplit,
        })
        .eq("id", profileId);

      if (wsError) console.error("Error updating weekly_workout_schedule:", wsError);
    }

    // Save weekly review row
    const { error: insertError } = await supabaseAdmin.from("weekly_reviews").insert({
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
      console.error("Error inserting weekly review:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Failed to save weekly review" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      analysis,
      updatedCalorieTarget: finalCalorieTarget,
      updatedWorkoutSchedule,
      calorieEngine: engine, // helpful for debugging (remove later if you want)
      usedActiveFocus: {
        focusAreas: activeFocusAreas,
        planNotes: activePlanNotes,
        updatedAt: (profile as any).active_focus_updated_at ?? null,
      },
    });
  } catch (err) {
    console.error("Weekly review route error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
