// app/api/sms-webhook/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";
import twilio from "twilio";
import { getTodayLocalDate } from "@/app/lib/utils";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export const parseYesNo = (body: string): boolean | null => {
  const text = body.trim().toLowerCase();
  if (["yes", "y"].includes(text)) return true;
  if (["no", "n"].includes(text)) return false;
  return null;
};

type UpsertCheckinArgs = {
  profile_id: string;
  checkin_date: string;
  did_workout: boolean | null;
  hit_calorie_goal: boolean | null;
  workout_rating: number | null;
  notes: string | null;
};

async function upsertDailyCheckin(args: UpsertCheckinArgs) {
  const {
    profile_id,
    checkin_date,
    did_workout,
    hit_calorie_goal,
    workout_rating,
    notes,
  } = args;

  const { error } = await supabase.from("daily_checkins").upsert(
    {
      profile_id,
      checkin_date,
      did_workout: did_workout ?? false,
      hit_calorie_goal: hit_calorie_goal ?? false,
      workout_rating,
      notes,
    },
    {
      onConflict: "profile_id,checkin_date",
    }
  );

  if (error) {
    console.error("upsertDailyCheckin error:", error);
  }
}

async function updateSessionStep(id: string, step: string) {
  const { error } = await supabase
    .from("sms_checkin_sessions")
    .update({ step })
    .eq("id", id);

  if (error) {
    console.error("updateSessionStep error:", error);
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const from = (formData.get("From") as string) || "";
    const body = (formData.get("Body") as string) || "";

    const phone = from.trim();
    const today = getTodayLocalDate();

    // 1) Find the active sms_checkin_session for this phone + date
    const { data: session, error: sessionError } = await supabase
      .from("sms_checkin_sessions")
      .select("id, profile_id, step, checkin_date")
      .eq("phone_number", phone)
      .eq("checkin_date", today)
      .maybeSingle();

    if (sessionError || !session) {
      console.error("No session found for SMS from", phone, sessionError);
      // optional: send a generic response
      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: phone,
        body: "Hey, I couldn’t match this reply to an active check-in. Please try again later or log via the app.",
      });
      return NextResponse.json({ ok: true });
    }

    // 2) Get or create today's daily_checkins row
    const { data: checkinRow, error: checkinError } = await supabase
      .from("daily_checkins")
      .select("*")
      .eq("profile_id", session.profile_id)
      .eq("checkin_date", session.checkin_date)
      .maybeSingle();

    if (checkinError) {
      console.error("Error loading daily_checkin:", checkinError);
      return NextResponse.json({ ok: true });
    }

    let did_workout = checkinRow?.did_workout ?? null;
    let hit_calorie_goal = checkinRow?.hit_calorie_goal ?? null;
    let workout_rating = checkinRow?.workout_rating ?? null;
    let notes = checkinRow?.notes ?? null;

    const replyText = body.trim();

    // 3) Branch on step
    if (session.step === "ask_did_workout") {
      const val = parseYesNo(replyText);
      if (val === null) {
        await twilioClient.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: phone,
          body: "Please reply YES or NO so I can log whether you worked out today 💪.",
        });
        return NextResponse.json({ ok: true });
      }

      did_workout = val;
      // Update row (insert or update)
      await upsertDailyCheckin({
        profile_id: session.profile_id,
        checkin_date: session.checkin_date,
        did_workout,
        hit_calorie_goal,
        workout_rating,
        notes,
      });

      // Update step → ask_hit_calories
      await updateSessionStep(session.id, "ask_hit_calories");

      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: phone,
        body: "Got it. Did you stay close to your calorie target today? Reply YES or NO.",
      });

      return NextResponse.json({ ok: true });
    }

    if (session.step === "ask_hit_calories") {
      const val = parseYesNo(replyText);
      if (val === null) {
        await twilioClient.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: phone,
          body: "Please reply YES or NO so I can log your calories for today 🍽️.",
        });
        return NextResponse.json({ ok: true });
      }

      hit_calorie_goal = val;
      await upsertDailyCheckin({
        profile_id: session.profile_id,
        checkin_date: session.checkin_date,
        did_workout,
        hit_calorie_goal,
        workout_rating,
        notes,
      });

      // If they did NOT work out, we can skip the rating step if you want.
      if (!did_workout) {
        await updateSessionStep(session.id, "ask_notes");
        await twilioClient.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: phone,
          body: "Any quick notes about today? Reply with a short message or type SKIP.",
        });
        return NextResponse.json({ ok: true });
      }

      // Else: ask rating 1–10
      await updateSessionStep(session.id, "ask_rating");
      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: phone,
        body: "Nice work. On a scale from 1–10, how would you rate your workout today? Reply with a number or type SKIP.",
      });
      return NextResponse.json({ ok: true });
    }

    if (session.step === "ask_rating") {
      const txt = replyText.toLowerCase();
      if (txt !== "skip") {
        const num = Number(replyText);
        if (!isNaN(num) && num >= 1 && num <= 10) {
          workout_rating = num;
        } else {
          await twilioClient.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER!,
            to: phone,
            body: "Please reply with a number between 1 and 10, or type SKIP.",
          });
          return NextResponse.json({ ok: true });
        }
      }

      await upsertDailyCheckin({
        profile_id: session.profile_id,
        checkin_date: session.checkin_date,
        did_workout,
        hit_calorie_goal,
        workout_rating,
        notes,
      });

      await updateSessionStep(session.id, "ask_notes");
      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: phone,
        body: "Any quick notes about today? Reply with a short message or type SKIP.",
      });

      return NextResponse.json({ ok: true });
    }

    if (session.step === "ask_notes") {
      if (replyText.toLowerCase() !== "skip") {
        // Append or set notes
        notes = notes ? `${notes}\n\n[SMS] ${replyText}` : `[SMS] ${replyText}`;
      }

      await upsertDailyCheckin({
        profile_id: session.profile_id,
        checkin_date: session.checkin_date,
        did_workout,
        hit_calorie_goal,
        workout_rating,
        notes,
      });

      await updateSessionStep(session.id, "complete");
      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER!,
        to: phone,
        body: "Check-in saved ✅. Proud of you for staying accountable today.",
      });

      return NextResponse.json({ ok: true });
    }

    // If step is 'complete' or unknown, send a generic message
    await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phone,
      body: "You’re already checked in for today 🎉. You can see details in your CoachIE dashboard.",
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("sms-webhook error:", err);
    // Twilio only needs a 200-ish status; you could still return JSON.
    return NextResponse.json({ ok: true });
  }
}
