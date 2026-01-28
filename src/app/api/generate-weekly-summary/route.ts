// src/app/api/generate-weekly-summary/route.ts
import { NextResponse } from "next/server";
import { openai } from "../../lib/openai";
import type {
  ClientProfile,
  DailyCheckinRow,
  WeeklySummaryResponse,
} from "../../lib/types";
import { createSupabaseServerClient } from "@/app/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    // ✅ Server client that reads Supabase auth cookies correctly
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // body is optional (kept in case you later want to filter by weekStart)
    await req.json().catch(() => ({}));

    // ✅ Derive profile from logged-in user (no profileId from client)
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("Error loading client profile:", profileError);
      return NextResponse.json(
        { error: "Could not load client profile" },
        { status: 500 }
      );
    }

    const clientProfile = profile as ClientProfile;
    const profileId = (profile as any).id as string;

    // ✅ Load recent daily check-ins (RLS enforced)
    const { data: checkins, error: checkinsError } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("profile_id", profileId)
      .order("checkin_date", { ascending: false })
      .limit(14);

    if (checkinsError) {
      console.error("Error loading daily checkins:", checkinsError);
      return NextResponse.json(
        { error: "Could not load daily check-ins" },
        { status: 500 }
      );
    }

    const dailyCheckins = (checkins ?? []) as DailyCheckinRow[];

    const totalDays = dailyCheckins.length;
    const daysWorkedOut = dailyCheckins.filter((c) => c.did_workout).length;
    const daysHitCalories = dailyCheckins.filter(
      (c) => c.hit_calorie_goal
    ).length;

    const ratings = dailyCheckins
      .map((c) => c.workout_rating)
      .filter((r): r is number => r !== null);

    const avgWorkoutRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : null;

    const adherence = {
      totalDays,
      daysWorkedOut,
      daysHitCalories,
      avgWorkoutRating,
    };

    const systemPrompt = [
      "You are an empathetic fitness and nutrition coach.",
      "",
      "You will receive:",
      "- clientProfile (including optional goal_why and past_struggles),",
      "- dailyCheckins (last 1–2 weeks),",
      "- adherence (pre-computed stats).",
      "",
      "Your job is to:",
      "- Summarize how this past week went in simple, supportive language.",
      "- Highlight consistency (workouts, calorie adherence, workout ratings).",
      "- Point out patterns (e.g., weekends harder, certain days always missed).",
      "- Suggest 2–4 very practical focus points for the coming week.",
      "- Give a short accountability message that feels like you're talking directly to them.",
      "- Use their goal_why to remind them why they started (if available).",
      "- Acknowledge their past_struggles when relevant (no shame).",
      "",
      "IMPORTANT:",
      "- Be supportive. No shaming.",
      "- In low-adherence weeks, focus on habits/structure (don’t push calorie changes).",
      "",
      "OUTPUT FORMAT:",
      "Return ONLY valid JSON with:",
      "- summary (string).",
      "- adherence (object) – MUST match the adherence object you were given.",
      "- nextWeekFocus (array of 2–5 short strings).",
      "- suggestions (array of 2–5 short, concrete action steps).",
      "- accountabilityMessage (string).",
      "- calorieAdjustment (object):",
      "    - recommendation: 'keep' | 'lower_slightly' | 'raise_slightly'.",
      "    - explanation: short string.",
      "",
      "Return ONLY JSON.",
    ].join("\n");

    const userContent = {
      clientProfile,
      dailyCheckins,
      adherence,
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Here is the client profile and recent daily check-ins as JSON:\n\n" +
            JSON.stringify(userContent, null, 2),
        },
      ],
      temperature: 0.6,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      return NextResponse.json(
        { error: "No content returned from OpenAI" },
        { status: 500 }
      );
    }

    let parsedNoAdherence: Omit<WeeklySummaryResponse, "adherence">;

    try {
      parsedNoAdherence = JSON.parse(raw) as Omit<
        WeeklySummaryResponse,
        "adherence"
      >;
    } catch {
      console.error("Failed to parse weekly summary JSON:", raw);
      return NextResponse.json(
        { error: "Failed to parse JSON from model" },
        { status: 500 }
      );
    }

    const result: WeeklySummaryResponse = {
      ...parsedNoAdherence,
      adherence, // ✅ force exact adherence numbers
    };

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error in /api/generate-weekly-summary:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: "Internal server error", details: message },
      { status: 500 }
    );
  }
}
