// app/api/crons/send-morning-workouts/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";
import { sendSms } from "@/app/lib/twilioClient";
import type { WeeklyWorkoutSession } from "@/app/lib/types";

function getTodayIso() {
  const now = new Date();
  // TODO: in v2, respect user's timezone
  return now.toISOString().slice(0, 10);
}

function getTodayDayName() {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(
    new Date()
  ); // "Monday"
}

export async function GET() {
  try {
    const todayIso = getTodayIso();
    const todayDayName = getTodayDayName();

    // 1) Load all clients with SMS check-ins enabled and a phone number
    const { data: profiles, error: profilesError } = await supabase
      .from("client_profiles")
      .select(
        "id, first_name, sms_phone_number, sms_checkins_enabled, weekly_workout_schedule"
      )
      .eq("sms_checkins_enabled", true)
      .not("sms_phone_number", "is", null);

    if (profilesError) {
      console.error("Error loading profiles for morning SMS:", profilesError);
      return NextResponse.json(
        { error: "Failed to load profiles" },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    let sentCount = 0;

    for (const profile of profiles) {
      const phone = profile.sms_phone_number as string | null;
      if (!phone) continue;

      const schedule = (profile.weekly_workout_schedule ??
        []) as WeeklyWorkoutSession[];

      // 2) Find today's workout session(s)
      const todaysSessions = schedule.filter(
        (s) => s.dayOfWeek === todayDayName
      );

      if (todaysSessions.length === 0) {
        // No lifting planned today → no morning SMS
        continue;
      }

      // v1: Just take the first session for the SMS
      const session = todaysSessions[0];

      const firstExercises = session.exercises.slice(0, 4);
      const exercisesSummary =
        firstExercises.length > 0
          ? firstExercises
              .map((ex) => `${ex.name} ${ex.sets}×${ex.reps}`)
              .join("\n")
          : "Focus on movement and steps today.";

      const body = [
        `Morning ${profile.first_name}! 🌞`,
        "",
        `Today's plan: ${session.workoutName}.`,
        exercisesSummary,
        "",
        "You’ve got this – I’ll check in tonight about how it went 💪",
      ].join("\n");

      try {
        await sendSms(phone, body);
        sentCount++;
      } catch (smsErr) {
        console.error(`Failed to send morning SMS to ${phone}:`, smsErr);
      }
    }

    return NextResponse.json({ sent: sentCount });
  } catch (err) {
    console.error("Morning workouts cron error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
