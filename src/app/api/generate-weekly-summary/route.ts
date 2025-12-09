import { NextResponse } from "next/server";
import { openai } from "../../lib/openai";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import type {
  ClientProfile,
  DailyCheckinRow,
  WeeklySummaryResponse,
} from "../../lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const profileId = body.profileId as string | undefined;

    if (!profileId) {
      return NextResponse.json(
        { error: "Missing profileId in request body" },
        { status: 400 }
      );
    }
    // 1) Load client profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("client_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      console.error("Error loading client profile:", profileError);
      return NextResponse.json(
        { error: "Could not load client profile" },
        { status: 500 }
      );
    }

    const clientProfile = profile as ClientProfile;

    // 2) Load recent daily check-ins (last 14 days, ordered newest → oldest)
    const { data: checkins, error: checkinsError } = await supabaseAdmin
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
      "Your job is to:",
      "- Review the client's profile and their last 1–2 weeks of daily check-ins.",
      "- Summarize how this past week went in simple, supportive language.",
      "- Highlight consistency (workouts, calorie adherence, workout ratings).",
      "- Point out patterns (e.g., weekends harder, certain days always missed).",
      "- Suggest 2–4 very practical focus points for the coming week.",
      "- Give a short accountability message that feels like you're talking directly to them.",
      "- Also, based on adherence and weight trend, decide if calories should be kept the same or adjusted slightly.",
      "",
      "IMPORTANT:",
      "- You are a coach, NOT a doctor. Do NOT give medical advice.",
      "- You may talk about small calorie adjustments in GENERAL terms (like slightly lowering intake)",
      "  but do NOT invent a brand new precise calorie target number (like 'now eat 1873 calories').",
      "- Instead, make a recommendation like 'keep', 'lower slightly', or 'raise slightly', with a short explanation.",
      "",
      "CALORIE ADJUSTMENT LOGIC (GUIDELINES):",
      "- If the client has been mostly consistent (many workouts, many days hitting calories)",
      "  AND weight has not changed meaningfully over ~10–14 days, it's reasonable to recommend 'lower_slightly'.",
      "- If adherence has been poor or inconsistent, recommend 'keep' and focus on habits, not changing calories.",
      "- Only recommend 'raise_slightly' if the client is clearly struggling with energy/recovery or under-eating",
      "  based on the notes.",
      "",
      "OUTPUT FORMAT:",
      "Return ONLY valid JSON with the following keys:",
      "- summary (string): conversational recap of how the week went.",
      "- nextWeekFocus (array of 2–5 short strings).",
      "- suggestions (array of 2–5 short, concrete action steps).",
      "- accountabilityMessage (string).",
      "- calorieAdjustment (object):",
      "    - recommendation: one of 'keep', 'lower_slightly', or 'raise_slightly'.",
      "    - explanation: short string explaining why you chose that option.",
      "",
      "Use the provided 'adherence' object for exact counts (totalDays, daysWorkedOut, daysHitCalories, avgWorkoutRating).",
      "Do NOT invent different numbers; if you mention stats, they must match the adherence object.",
      "Return ONLY JSON. No extra commentary.",
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
      console.error("OpenAI returned no content:", completion);
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

    // ✅ Our final object: LLM’s narrative + our exact adherence metrics
    const result: WeeklySummaryResponse = {
      ...parsedNoAdherence,
      adherence, // 👈 this overwrites anything the model might have said
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
