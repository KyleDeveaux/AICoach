// app/api/sms/cron/route.ts
// Single hourly cron that handles morning workout reminders AND evening check-ins.
// Vercel calls GET; auth via CRON_SECRET in Authorization header.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import type { WeeklyWorkoutSession } from "@/app/lib/types";
import {
  getLocalTimeParts,
  getTodayWorkout,
  buildWorkoutSummary,
  generateCoachSms,
  sendAndLogSms,
} from "@/app/lib/smsHelpers";

export const runtime = "nodejs";

// ─── Auth & Config ──────────────────────────────────────────

function verifyCronSecret(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.headers.get("x-cron-secret");
  return auth === secret;
}

function isTestMode(req: Request): boolean {
  // Test mode bypasses time windows. Only works in development or with valid auth.
  const url = new URL(req.url);
  return url.searchParams.get("test") === "true";
}

// ─── Types ──────────────────────────────────────────────────

interface SubWithProfile {
  id: string;
  profile_id: string;
  user_id: string;
  phone_e164: string;
  timezone: string | null;
  // joined profile fields
  client_profiles: {
    first_name: string | null;
    timezone: string | null;
    goal_why: string | null;
    past_struggles: string | null;
    weekly_workout_schedule: WeeklyWorkoutSession[] | null;
  };
}

// ─── Morning workout reminders ──────────────────────────────

async function processMorningReminders(
  subs: SubWithProfile[],
  results: { morningCount: number; errors: string[] },
  testMode: boolean
) {
  for (const sub of subs) {
    try {
      const profile = sub.client_profiles;
      const tz =
        sub.timezone || profile.timezone || process.env.DEFAULT_TIMEZONE || "UTC";
      const { date: localDate, hour, dayName } = getLocalTimeParts(tz);

      // Only send between 7-10 AM local time (unless test mode)
      if (!testMode && (hour < 7 || hour > 10)) continue;

      const schedule = profile.weekly_workout_schedule ?? [];
      const todayWorkout = getTodayWorkout(schedule, dayName);
      if (!todayWorkout) continue; // Rest day — no morning SMS

      // Check if we already sent a morning reminder today
      const { data: existingMsg } = await supabaseAdmin
        .from("sms_messages")
        .select("id")
        .eq("profile_id", sub.profile_id)
        .eq("metadata->>kind", "morning_workout")
        .eq("metadata->>checkin_date", localDate)
        .limit(1);

      if (existingMsg && existingMsg.length > 0) continue; // Already sent

      const firstName = profile.first_name || "there";
      const summary = buildWorkoutSummary(todayWorkout);

      const body = [
        `Morning ${firstName}! Today's workout:`,
        summary,
        "",
        "I'll check in tonight about how it went",
      ].join("\n");

      await sendAndLogSms({
        phone: sub.phone_e164,
        body,
        profileId: sub.profile_id,
        userId: sub.user_id,
        kind: "morning_workout",
        extra: { checkin_date: localDate },
      });

      results.morningCount++;
    } catch (err: any) {
      results.errors.push(
        `morning:${sub.profile_id}:${err?.message || err}`
      );
    }
  }
}

// ─── Evening check-in openers & follow-ups ──────────────────

async function processEveningCheckins(
  subs: SubWithProfile[],
  results: { eveningCount: number; followUpCount: number; errors: string[] },
  testMode: boolean
) {
  for (const sub of subs) {
    try {
      const profile = sub.client_profiles;
      const tz =
        sub.timezone || profile.timezone || process.env.DEFAULT_TIMEZONE || "UTC";
      const { date: localDate, hour, dayName } = getLocalTimeParts(tz);

      // Only process between 6-9 PM local time (unless test mode)
      if (!testMode && (hour < 18 || hour > 21)) continue;

      const firstName = profile.first_name || "there";

      // Skip if daily check-in already exists
      const { data: existingCheckin } = await supabaseAdmin
        .from("daily_checkins")
        .select("id")
        .eq("profile_id", sub.profile_id)
        .eq("checkin_date", localDate)
        .limit(1);

      if (existingCheckin && existingCheckin.length > 0) continue;

      // Check existing conversation state
      const { data: state } = await supabaseAdmin
        .from("sms_checkin_states")
        .select("*")
        .eq("profile_id", sub.profile_id)
        .eq("checkin_date", localDate)
        .maybeSingle();

      // If conversation is completed, skip
      if (state && state.stage === "completed") continue;

      // If mid-conversation and stale (2+ hours), send follow-up
      if (
        state &&
        state.stage !== "completed" &&
        state.stage !== "idle"
      ) {
        const lastMsg = new Date(state.last_message_at).getTime();
        const hoursSince = (Date.now() - lastMsg) / (1000 * 60 * 60);

        if (hoursSince >= 2) {
          const pendingQuestion =
            state.stage === "asked_workout" ? "workout" : "calories";

          const followUp = await generateCoachSms({
            firstName,
            instruction: `Send a brief, friendly follow-up nudge. The client hasn't replied to your ${pendingQuestion} question. Keep it casual and short. Ask them to reply yes or no.`,
            fallback:
              pendingQuestion === "workout"
                ? `Hey ${firstName}, just checking — did you get a workout in today? Quick yes or no works!`
                : `Still here ${firstName}! Did you stay close to your calorie target today? Yes or no?`,
          });

          await sendAndLogSms({
            phone: sub.phone_e164,
            body: followUp,
            profileId: sub.profile_id,
            userId: sub.user_id,
            kind: "checkin_followup",
            extra: { checkin_date: localDate, stage: state.stage },
          });

          await supabaseAdmin
            .from("sms_checkin_states")
            .update({ last_message_at: new Date().toISOString() })
            .eq("id", state.id);

          results.followUpCount++;
        }
        continue; // Don't start a new conversation
      }

      // No state row — start a new conversation
      const schedule = profile.weekly_workout_schedule ?? [];
      const todayWorkout = getTodayWorkout(schedule, dayName);
      const isWorkoutDay = !!todayWorkout;

      const opener = await generateCoachSms({
        firstName,
        goalWhy: profile.goal_why,
        pastStruggles: profile.past_struggles,
        instruction: isWorkoutDay
          ? `Start an evening check-in. Today was a workout day (${todayWorkout!.workoutName}). Ask if they got their workout done today. Expect a yes/no reply.`
          : `Start an evening check-in. Today is a rest day (no workout planned). Ask if they got any movement in today — a walk, stretching, anything. Expect a yes/no reply.`,
        fallback: isWorkoutDay
          ? `Hey ${firstName}, how'd today's workout go? Did you get it done? (yes/no)`
          : `Hey ${firstName}, quick check-in — did you get any movement in today? A walk, stretching, anything? (yes/no)`,
      });

      await sendAndLogSms({
        phone: sub.phone_e164,
        body: opener,
        profileId: sub.profile_id,
        userId: sub.user_id,
        kind: "checkin_opener",
        extra: { checkin_date: localDate, isWorkoutDay },
      });

      // Create or reset the conversation state
      await supabaseAdmin.from("sms_checkin_states").upsert(
        {
          profile_id: sub.profile_id,
          checkin_date: localDate,
          stage: "asked_workout",
          did_workout: null,
          hit_calorie_goal: null,
          notes: null,
          last_message_at: new Date().toISOString(),
        },
        { onConflict: "profile_id,checkin_date" }
      );

      results.eveningCount++;
    } catch (err: any) {
      results.errors.push(
        `evening:${sub.profile_id}:${err?.message || err}`
      );
    }
  }
}

// ─── GET handler ────────────────────────────────────────────

export async function GET(req: Request) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Load all active subscriptions with their profile data
    const { data: subs, error: subsErr } = await supabaseAdmin
      .from("sms_subscriptions")
      .select(
        `
        id,
        profile_id,
        user_id,
        phone_e164,
        timezone,
        client_profiles!inner (
          first_name,
          timezone,
          goal_why,
          past_struggles,
          weekly_workout_schedule
        )
      `
      )
      .eq("status", "active");

    if (subsErr) {
      console.error("[sms/cron] subscription load error:", subsErr.message);
      return NextResponse.json(
        { error: "Failed to load subscriptions" },
        { status: 500 }
      );
    }

    if (!subs || subs.length === 0) {
      return NextResponse.json({ morning: 0, evening: 0, followUp: 0 });
    }

    const typedSubs = subs as unknown as SubWithProfile[];
    const testMode = isTestMode(req);

    const morningResults = { morningCount: 0, errors: [] as string[] };
    const eveningResults = {
      eveningCount: 0,
      followUpCount: 0,
      errors: [] as string[],
    };

    await processMorningReminders(typedSubs, morningResults, testMode);
    await processEveningCheckins(typedSubs, eveningResults, testMode);

    const allErrors = [...morningResults.errors, ...eveningResults.errors];
    if (allErrors.length > 0) {
      console.error("[sms/cron] errors:", allErrors);
    }

    return NextResponse.json({
      morning: morningResults.morningCount,
      evening: eveningResults.eveningCount,
      followUp: eveningResults.followUpCount,
      errors: allErrors.length,
      testMode,
    });
  } catch (err: any) {
    console.error("[sms/cron] route error:", err?.message || err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
