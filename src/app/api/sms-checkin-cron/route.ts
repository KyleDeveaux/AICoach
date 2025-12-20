// app/api/sms-checkin-cron/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";
import twilio from "twilio";
import { getTodayLocalDate } from "@/app/lib/utils";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST() {
  try {
    const today = getTodayLocalDate();

    // 1) Get all clients who opted into SMS
    const { data: profiles, error: profilesError } = await supabase
      .from("client_profiles")
      .select("id, first_name, phone_number, sms_opt_in")
      .eq("sms_opt_in", true)
      .not("phone_number", "is", null);

    if (profilesError) {
      console.error("Error loading profiles for SMS:", profilesError);
      return NextResponse.json(
        { error: "Failed loading profiles" },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ ok: true, message: "No SMS clients" });
    }

    for (const profile of profiles) {
      const phone = profile.phone_number as string;

      // 2) Has a checkin already been logged for today?
      const { data: existingCheckin, error: checkinError } = await supabase
        .from("daily_checkins")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("checkin_date", today)
        .maybeSingle();

      if (checkinError) {
        console.error("Error checking existing daily checkin:", checkinError);
        continue;
      }

      if (existingCheckin) {
        // Already logged; skip sending SMS.
        continue;
      }

      // 3) Create/Upsert an sms_checkin_session row starting at step 'ask_did_workout'
      const { error: sessionError } = await supabase
        .from("sms_checkin_sessions")
        .upsert(
          {
            profile_id: profile.id,
            phone_number: phone,
            checkin_date: today,
            step: "ask_did_workout",
          },
          {
            onConflict: "profile_id,checkin_date",
          }
        );

      if (sessionError) {
        console.error("Error creating sms_checkin_session:", sessionError);
        continue;
      }

      // 4) Send SMS: first question
      const msg = `Hey ${profile.first_name}, quick check-in for today:\n\nDid you work out? Reply YES or NO.`;

      try {
        await twilioClient.messages.create({
          from: process.env.TWILIO_PHONE_NUMBER!,
          to: phone,
          body: msg,
        });
      } catch (twilioErr) {
        console.error("Error sending SMS to", phone, twilioErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("sms-checkin-cron error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
