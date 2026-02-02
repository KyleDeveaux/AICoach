// src/app/api/generate-initial-plan/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import crypto from "crypto";

import { openai } from "@/app/lib/openai";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";

// ------------------------------
// 1) Input validation (Zod v4-safe)
// ------------------------------
const BodySchema = z.object({
  profileId: z.string().uuid(),

  // ✅ Zod v4-safe: allow arbitrary keys/values on an object
  callAnswers: z.object({}).passthrough().optional(),

  macroTargets: z.object({
    calorieTarget: z.number().int().min(800).max(6000),
  }),
});

// ------------------------------
// 2) Output validation
// ------------------------------
const ExerciseSchema = z.object({
  name: z.string().min(2),
  sets: z.number().int().min(1).max(6),
  reps: z.union([z.number().int().min(1).max(50), z.string().min(1)]),
  rest_seconds: z.number().int().min(0).max(600),
  notes: z.string().optional().nullable(),
  gifSearchTerm: z.string().min(2),
  gifUrl: z.string().url().optional().nullable(),
});

const WorkoutDaySchema = z.object({
  dayOfWeek: z.string().min(3),
  workoutName: z.string().min(2),
  exercises: z.array(ExerciseSchema).min(5).max(7),
});

const PlanSchema = z
  .object({
    planSummary: z.string().min(20),
    calorieTarget: z.number().int(),
    proteinTarget_g: z.number().int().min(50).max(350),
    workoutsPerWeek: z.number().int().min(1).max(7),
    workoutSplit: z.array(z.string().min(2)).min(1).max(7),
    weeklyWorkoutSchedule: z.array(WorkoutDaySchema).min(1).max(7),
    stepTarget: z.number().int().min(2000).max(25000),
    goalWhy: z.string().min(5),
    pastStruggles: z.string().min(5),
    toneNotes: z.string().min(5),
  })
  .superRefine((val, ctx) => {
    if (val.weeklyWorkoutSchedule.length !== val.workoutsPerWeek) {
      ctx.addIssue({
        code: "custom",
        message:
          "weeklyWorkoutSchedule length must match workoutsPerWeek exactly.",
        path: ["weeklyWorkoutSchedule"],
      });
    }
  });

type InitialPlanResponse = z.infer<typeof PlanSchema>;

// ------------------------------
// 3) Helpers
// ------------------------------
function stripFences(text: string) {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function clampText(value: unknown, maxLen: number): string {
  if (typeof value !== "string") return "";
  return value.length <= maxLen ? value : value.slice(0, maxLen);
}

function requireEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

// ------------------------------
// 4) Prompt (detailed constraints)
// ------------------------------
const systemPrompt = [
  "You are an empathetic fitness and nutrition coach.",
  "",
  "Your job is to:",
  "- Review the client's profile and first-call answers.",
  "- Use the provided macroTargets.calorieTarget as the client's daily calories.",
  "  You MUST return this exact number as calorieTarget in your JSON. Do NOT invent a different calorie value.",
  "- Based on that calorie target, decide realistic macro splits (protein, carbs, fats), workout days, and step goal.",
  "- Summarize the plan back to the client in simple, supportive language.",
  "- Extract and save their main 'why' and main past struggles for future accountability.",
  "",
  "You are a coach, NOT a doctor. You must not give medical advice.",
  "If the client mentions medical conditions, gently recommend they speak to a healthcare professional before making changes.",
  "",
  "OUTPUT FORMAT (IMPORTANT): Return ONLY valid JSON with exactly these keys:",
  "- planSummary (string)",
  "- calorieTarget (number) MUST match macroTargets.calorieTarget",
  "- proteinTarget_g (number)",
  "- workoutsPerWeek (number)",
  '- workoutSplit (array of strings, e.g. ["Upper A","Lower A","Upper B"])',
  "- weeklyWorkoutSchedule (array of objects, one per workout session):",
  '  - dayOfWeek (e.g. "Monday")',
  "  - workoutName",
  "  - exercises: array of 5–7 exercise objects, each with:",
  "    - name",
  "    - sets (number)",
  "    - reps (number or string like '8-12')",
  "    - rest_seconds (number)",
  "    - notes",
  "    - gifSearchTerm (short search phrase)",
  "    - gifUrl (string or null; OPTIONAL only if confident it's real)",
  "- stepTarget (number)",
  "- goalWhy (string)",
  "- pastStruggles (string)",
  "- toneNotes (string)",
  "",
  "WORKOUT RULES (IMPORTANT):",
  "- weeklyWorkoutSchedule MUST contain EXACTLY workoutsPerWeek workouts.",
  "- Each workout MUST include 5–7 exercises (no fewer).",
  "- Exercises must match the client's equipment access.",
  "- Use realistic programming:",
  "  - Compounds/accessories: 3–4 sets, 6–12 reps",
  "  - Isolation/core: 2–3 sets, 10–15 reps",
  "  - Rest 60–180 seconds depending on movement",
  "- Keep it beginner-friendly unless profile suggests advanced training.",
  "- Choose days that make sense (e.g. Mon/Wed/Fri for 3x/week).",
  "",
  "PHOTO ANALYSIS (if provided):",
  "- If the client data includes active_focus_areas or photoAnalysisSummary, use this to tailor the workout plan.",
  "- Focus areas identify muscle groups or body regions that need extra attention based on AI analysis of the client's physique.",
  "- Prioritize exercises that target these focus areas. For example, if 'shoulders' and 'core' are focus areas,",
  "  include more shoulder and core exercises across workout days.",
  "- If active_plan_notes are provided, incorporate those coaching recommendations into your exercise selection.",
  "- If no photo analysis data is present, ignore this section and generate a standard plan.",
  "",
  "Return ONLY JSON. No markdown. No extra commentary.",
].join("\n");

// ------------------------------
// 5) Route
// ------------------------------
export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const isProd = process.env.NODE_ENV === "production";

  try {
    // Fail fast on missing envs (common source of 500)
    requireEnv("NEXT_PUBLIC_SUPABASE_URL");
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");
    requireEnv("OPENAI_API_KEY");

    // Auth (cookie-based)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized", requestId },
        { status: 401 }
      );
    }

    // Validate body
    const rawBody = await req.json().catch(() => null);
    const bodyParsed = BodySchema.safeParse(rawBody);

    if (!bodyParsed.success) {
      return NextResponse.json(
        {
          error: "Invalid request body",
          requestId,
          details: bodyParsed.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { profileId, macroTargets } = bodyParsed.data;

    // Ownership check (prevents IDOR)
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select(
        [
          "id",
          "user_id",
          "first_name",
          "last_name",
          "age",
          "gender",
          "height_cm",
          "weight_kg",
          "goal_type",
          "goal_weight_kg",
          "realistic_workouts_per_week",
          "equipment",
          "preferred_workout_time",
          "work_schedule",
          "estimated_steps",
          "calorie_target",
          "active_focus_areas",
          "active_plan_notes",
        ].join(",")
      )
      .eq("id", profileId)
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found", requestId },
        { status: 404 }
      );
    }

    // Sanitize callAnswers for token safety
    const callAnswersRaw = bodyParsed.data.callAnswers ?? {};
    const safeCallAnswers = {
      why: clampText((callAnswersRaw as any).why, 600),
      futureVision: clampText((callAnswersRaw as any).futureVision, 600),
      pastStruggles: clampText((callAnswersRaw as any).pastStruggles, 600),
      notes: clampText((callAnswersRaw as any).notes, 900),
      planRealismRating: Number.isFinite((callAnswersRaw as any).planRealismRating)
        ? (callAnswersRaw as any).planRealismRating
        : undefined,
      photoAnalysisSummary: clampText((callAnswersRaw as any).photoAnalysisSummary, 800),
    };

    const userPayload = {
      clientProfile: profile,
      callAnswers: safeCallAnswers,
      macroTargets,
    };

    // Run model (with one retry if it fails validation)
    async function runModel(attempt: 1 | 2, correction?: string) {
      const messages: Array<{ role: "system" | "user"; content: string }> = [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ];

      if (attempt === 2 && correction) {
        messages.push({
          role: "user",
          content:
            "Your previous JSON did not meet requirements. Fix it. " +
            correction,
        });
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.6,
        response_format: { type: "json_object" },
        messages,
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        return { ok: false as const, error: "No content from model" };
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripFences(raw));
      } catch {
        return { ok: false as const, error: "Model returned invalid JSON" };
      }

      const validated = PlanSchema.safeParse(parsed);
      if (!validated.success) {
        return {
          ok: false as const,
          error: "Model output failed validation",
          issues: validated.error.issues.map((i) => i.message),
        };
      }

      // Enforce calorie target exactly
      validated.data.calorieTarget = macroTargets.calorieTarget;

      return { ok: true as const, data: validated.data };
    }

    let result = await runModel(1);

    if (!result.ok) {
      const correction = result.issues
        ? `Rules you violated: ${result.issues.join(
            " | "
          )}. Remember: weeklyWorkoutSchedule length must equal workoutsPerWeek and each workout must have 5–7 exercises.`
        : "Return complete JSON per the requirements.";

      result = await runModel(2, correction);
    }

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Could not generate a valid plan. Try again.",
          requestId,
          debug: isProd ? undefined : result,
        },
        { status: 502 }
      );
    }

    const plan: InitialPlanResponse = result.data;

    // Save into DB using service role (safe because ownership verified above)
    const { error: updateError } = await supabaseAdmin
      .from("client_profiles")
      .update({
        workout_split: plan.workoutSplit,
        weekly_workout_schedule: plan.weeklyWorkoutSchedule,
        goal_why: plan.goalWhy,
        past_struggles: plan.pastStruggles,
      })
      .eq("id", profileId);

    if (updateError) {
      console.error("generate-initial-plan: DB update failed", {
        requestId,
        message: updateError.message,
      });
      // still return plan so user isn't blocked
    }

    return NextResponse.json({ ...plan, requestId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected server error";
    console.error("generate-initial-plan route error:", { requestId, message });

    return NextResponse.json(
      {
        error: "Unexpected server error",
        requestId,
        debug: isProd ? undefined : message,
      },
      { status: 500 }
    );
  }
}
