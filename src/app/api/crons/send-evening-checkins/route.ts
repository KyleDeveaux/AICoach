// app/api/crons/send-evening-checkins/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";
import { sendSms } from "@/app/lib/twilioClient";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

function getTodayIso() {
  const now = new Date();
  // TODO: later: use each user's timezone
  return now.toISOString().slice(0, 10);
}

export async function GET() {
  try {
    const todayIso = getTodayIso();

    // 1) Get all clients who allow SMS
    const { data: profiles, error: profilesError } = await supabase
      .from("client_profiles")
      .select(
        "id, first_name, goal_why, sms_phone_number, sms_checkins_enabled"
      )
      .eq("sms_checkins_enabled", true)
      .not("sms_phone_number", "is", null);

    if (profilesError) {
      console.error("Error loading profiles for evening SMS:", profilesError);
      return NextResponse.json(
        { error: "Failed to load profiles" },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ started: 0 });
    }

    let startedCount = 0;

    for (const profile of profiles) {
      const phone = profile.sms_phone_number as string | null;
      if (!phone) continue;

      // 2) Skip if they already have a daily_checkin for today
      const { data: existingCheckins, error: checkinsError } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("checkin_date", todayIso)
        .limit(1);

      if (checkinsError) {
        console.error("Error checking existing checkin:", checkinsError);
        continue;
      }

      if (existingCheckins && existingCheckins.length > 0) {
        // They already checked in via app or SMS.
        continue;
      }

      // 3) Check if we already started a conversation today
      const { data: state, error: stateError } = await supabase
        .from("sms_checkin_states")
        .select("*")
        .eq("profile_id", profile.id)
        .eq("checkin_date", todayIso)
        .maybeSingle();

      if (stateError) {
        console.error("Error loading sms_checkin_state:", stateError);
        continue;
      }

      if (state && state.stage !== "idle" && state.stage !== "completed") {
        // Already mid-conversation; don't restart.
        continue;
      }

      // 4) Generate a friendly opening SMS with the LLM
      const systemPrompt = `
You are a warm, concise fitness coach texting a client at the end of the day.
Write a SHORT SMS (max 2 short sentences) to start a daily check-in.
Ask if they did their planned workout today.
Tone: casual, supportive, 1 emoji max.
Return ONLY the SMS text, no quotes.
`;

      const userPayload = {
        firstName: profile.first_name,
        goalWhy: profile.goal_why,
      };

      let smsBody =
        `Hey ${profile.first_name}, quick check-in 👋 Did you get your workout in today? (yes/no)`;

      try {
        const resp = await openai.responses.create({
          model: "gpt-4.1-mini",
          input: [
            { role: "system", content: systemPrompt },
            { role: "user", content: JSON.stringify(userPayload) },
          ],
        });

        const firstOutput: any = resp.output?.[0];
        const text = firstOutput?.content?.[0]?.text;
        if (typeof text === "string" && text.trim().length > 0) {
          smsBody = text.trim();
        }
      } catch (llmErr) {
        console.error("Error generating evening SMS opening:", llmErr);
        // fall back to default smsBody
      }

      // 5) Send SMS
      try {
        await sendSms(phone, smsBody);

        // 6) Upsert state row to "asked_workout"
        await supabase.from("sms_checkin_states").upsert(
          {
            profile_id: profile.id,
            checkin_date: todayIso,
            stage: "asked_workout",
            last_message_at: new Date().toISOString(),
          },
          { onConflict: "profile_id,checkin_date" }
        );

        startedCount++;
      } catch (smsErr) {
        console.error(`Failed to send evening SMS to ${phone}:`, smsErr);
      }
    }

    return NextResponse.json({ started: startedCount });
  } catch (err) {
    console.error("Evening checkins cron error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
