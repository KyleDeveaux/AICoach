// app/api/weekly-review/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

// ✅ Server-side Supabase client using SERVICE ROLE key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // server-only, NEVER exposed to browser
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Helper: from a weekStart (YYYY-MM-DD, Monday) → [start, end(Sunday)]
function getWeekRangeFromWeekStart(weekStart: string) {
  const startDate = new Date(weekStart + "T00:00:00Z");
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  return {
    start: weekStart,
    end: endDate.toISOString().slice(0, 10), // YYYY-MM-DD
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      profileId,
      form,
      weekStart,
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

    // 🔹 Basic validation
    if (!profileId || !form) {
      return NextResponse.json(
        { error: "Missing profileId or form" },
        { status: 400 }
      );
    }

    if (!weekStart) {
      return NextResponse.json(
        { error: "Missing weekStart" },
        { status: 400 }
      );
    }

    const { start: rangeStart, end: rangeEnd } =
      getWeekRangeFromWeekStart(weekStart);

    // 1) Load profile + checkins for that week
    const [
      { data: profile, error: profileError },
      { data: checkins, error: checkinsError },
    ] = await Promise.all([
      supabaseAdmin
        .from("client_profiles")
        .select("*")
        .eq("id", profileId)
        .single(),
      supabaseAdmin
        .from("daily_checkins")
        .select("*")
        .eq("profile_id", profileId)
        .gte("checkin_date", rangeStart)
        .lte("checkin_date", rangeEnd),
    ]);

    if (profileError || !profile) {
      console.error("Error loading profile:", profileError);
      return NextResponse.json(
        { error: "Could not load profile" },
        { status: 500 }
      );
    }

    if (checkinsError) {
      console.error("Error loading checkins:", checkinsError);
      return NextResponse.json(
        { error: "Could not load check-ins" },
        { status: 500 }
      );
    }

    const safeCheckins = checkins ?? [];

    const adherence = {
      totalDays: safeCheckins.length,
      daysWorkedOut: safeCheckins.filter((c: any) => c.did_workout).length,
      daysHitCalories: safeCheckins.filter((c: any) => c.hit_calorie_goal)
        .length,
    };

    const systemPrompt = `
You are an empathetic fitness coach. 
You will receive:
- client profile
- this week's daily check-ins
- a short weekly review form (weight, effort, what went well, what got in the way).

Return ONLY valid JSON with this shape:

{
  "summary": string,
  "adherence": {
    "totalDays": number,
    "daysWorkedOut": number,
    "daysHitCalories": number
  },
  "calorieAdjustment": {
    "recommendation": "keep" | "lower_slightly" | "raise_slightly",
    "explanation": string
  },
  "accountabilityMessage": string
}

Important:
- Only recommend "lower_slightly" or "raise_slightly" if the client has been consistent
  (good adherence AND reported decent effort) and is likely at a plateau.
- Otherwise use "keep" and explain that we keep calories steady for now.
`;

    const userPayload = {
      profile,
      adherence,
      checkins: safeCheckins,
      weeklyReview: form,
    };

    // 2) Call OpenAI for analysis
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
      analysis = JSON.parse(rawText);
    } catch (err) {
      console.error("Failed to parse LLM JSON:", err, rawText);
      return NextResponse.json(
        { error: "Could not parse AI response" },
        { status: 500 }
      );
    }

    // 3) Calorie adjustment logic
    const currentTarget: number | null =
      (profile.calorie_target as number | null) ?? null;

    let finalCalorieTarget = currentTarget;
    const recommendation = analysis?.calorieAdjustment?.recommendation;

    if (currentTarget && recommendation && recommendation !== "keep") {
      let proposed = currentTarget;

      if (recommendation === "lower_slightly") {
        proposed = Math.max(1200, currentTarget - 150);
      } else if (recommendation === "raise_slightly") {
        proposed = currentTarget + 150;
      }

      const { data: updatedProfile, error: updateError } = await supabaseAdmin
        .from("client_profiles")
        .update({ calorie_target: proposed })
        .eq("id", profileId)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating calorie_target:", updateError);
      } else if (updatedProfile) {
        finalCalorieTarget = updatedProfile.calorie_target as number;
      }
    }

    // 🔹 For now we just keep the existing weekly_workout_schedule
    const updatedWorkoutSchedule =
      (profile.weekly_workout_schedule as any[]) ?? null;

    if (updatedWorkoutSchedule) {
      const { error: wsError } = await supabaseAdmin
        .from("client_profiles")
        .update({ weekly_workout_schedule: updatedWorkoutSchedule })
        .eq("id", profileId);

      if (wsError) {
        console.error("Error updating weekly_workout_schedule:", wsError);
      }
    }

    // 4) Save weekly review row
    const { error: insertError } = await supabaseAdmin
      .from("weekly_reviews")
      .insert({
        // 👇 This helps if your table has a NOT NULL id without default
        id: crypto.randomUUID(),
        profile_id: profileId,
        week_start: weekStart, // MUST match what dashboard queries
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

    // 5) Return data used by the dashboard UI
    return NextResponse.json({
      analysis,
      updatedCalorieTarget: finalCalorieTarget,
      updatedWorkoutSchedule,
    });
  } catch (err) {
    console.error("Weekly review route error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
