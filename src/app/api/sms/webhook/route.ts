// app/api/sms/webhook/route.ts
// Handles all inbound SMS from Twilio.
// State machine: asked_workout → asked_calories → completed (via sms_checkin_states).
// STOP/HELP/START keyword handling for compliance.

import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { sendSms, verifyTwilioSignature } from "@/app/lib/twilioServer";
import {
  getLocalTimeParts,
  parseYesNo,
  generateCoachSms,
  sendAndLogSms,
  logSmsMessage,
  upsertDailyCheckinPatch,
} from "@/app/lib/smsHelpers";

export const runtime = "nodejs";

// ─── Helpers ────────────────────────────────────────────────

function toParams(rawBody: string): Record<string, string> {
  const sp = new URLSearchParams(rawBody);
  const out: Record<string, string> = {};
  for (const [k, v] of sp.entries()) out[k] = v;
  return out;
}

function twiml(): NextResponse {
  return new NextResponse("<Response></Response>", {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function isStop(body: string) {
  return ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(
    body.trim().toUpperCase()
  );
}

function isHelp(body: string) {
  return ["HELP", "INFO"].includes(body.trim().toUpperCase());
}

function isStart(body: string) {
  return ["START", "UNSTOP"].includes(body.trim().toUpperCase());
}

// ─── POST handler ───────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const params = toParams(rawBody);

    // Verify Twilio signature
    const okSig = verifyTwilioSignature({ req, params });
    if (!okSig) {
      console.log("[sms/webhook] Signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const from = (params["From"] || "").trim();
    const to = (params["To"] || "").trim();
    const body = (params["Body"] || "").trim();
    const messageSid = (params["MessageSid"] || "").trim();

    if (!from || !body) {
      return NextResponse.json({ error: "Missing From/Body" }, { status: 400 });
    }

    // ─── Subscription lookup ──────────────────────────────

    const { data: sub, error: subErr } = await supabaseAdmin
      .from("sms_subscriptions")
      .select("id, profile_id, user_id, phone_e164, status, timezone")
      .eq("phone_e164", from)
      .maybeSingle();

    if (subErr) {
      console.error("[sms/webhook] subscription lookup error:", subErr.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!sub) {
      await sendSms(
        from,
        "Hi! This number isn't linked to a Motivo account. If you think this is a mistake, contact support in the app."
      );
      return twiml();
    }

    // ─── Log inbound message ──────────────────────────────

    await logSmsMessage({
      profileId: sub.profile_id,
      userId: sub.user_id,
      direction: "inbound",
      from,
      to,
      body,
      sid: messageSid || null,
      kind: "inbound_webhook",
    });

    const nowIso = new Date().toISOString();

    // Update last inbound timestamp
    await supabaseAdmin
      .from("sms_subscriptions")
      .update({ last_inbound_at: nowIso, updated_at: nowIso })
      .eq("id", sub.id);

    // ─── STOP / HELP / START ──────────────────────────────

    if (isStop(body)) {
      await supabaseAdmin
        .from("sms_subscriptions")
        .update({
          status: "stopped",
          opted_out_at: nowIso,
          updated_at: nowIso,
        })
        .eq("id", sub.id);

      await supabaseAdmin
        .from("client_profiles")
        .update({ sms_checkins_enabled: false, allow_sms_checkins: false })
        .eq("id", sub.profile_id);

      await sendAndLogSms({
        phone: from,
        body: "You're unsubscribed from Motivo SMS coaching. Reply START to re-enable. (Msg & data rates may apply.)",
        profileId: sub.profile_id,
        userId: sub.user_id,
        kind: "stop_reply",
      });
      return twiml();
    }

    if (isHelp(body)) {
      await sendAndLogSms({
        phone: from,
        body:
          "Motivo SMS Coaching Help:\n" +
          "- Reply STOP to unsubscribe\n" +
          "- Reply START to re-enable\n" +
          "We send automated check-ins for workouts + calories.\n" +
          "Msg & data rates may apply.",
        profileId: sub.profile_id,
        userId: sub.user_id,
        kind: "help_reply",
      });
      return twiml();
    }

    if (isStart(body)) {
      await supabaseAdmin
        .from("sms_subscriptions")
        .update({ status: "active", opted_out_at: null, updated_at: nowIso })
        .eq("id", sub.id);

      await supabaseAdmin
        .from("client_profiles")
        .update({ sms_checkins_enabled: true, allow_sms_checkins: true })
        .eq("id", sub.profile_id);

      await sendAndLogSms({
        phone: from,
        body:
          "Motivo SMS coaching is back on!\n" +
          "Reply STOP to unsubscribe. Reply HELP for help.\n" +
          "Msg & data rates may apply.",
        profileId: sub.profile_id,
        userId: sub.user_id,
        kind: "start_reply",
      });
      return twiml();
    }

    // If stopped, don't process further
    if (sub.status !== "active") {
      await sendAndLogSms({
        phone: from,
        body: "SMS coaching is currently off. Reply START to re-enable or open Settings in the app.",
        profileId: sub.profile_id,
        userId: sub.user_id,
        kind: "inactive_reply",
      });
      return twiml();
    }

    // ─── Load profile for personalization ─────────────────

    const { data: profile } = await supabaseAdmin
      .from("client_profiles")
      .select("first_name, timezone, goal_why, past_struggles")
      .eq("id", sub.profile_id)
      .single();

    const firstName = profile?.first_name || "there";
    const tz = sub.timezone || profile?.timezone || process.env.DEFAULT_TIMEZONE || "UTC";
    const { date: localDate } = getLocalTimeParts(tz);

    // ─── State machine via sms_checkin_states ─────────────

    const { data: state } = await supabaseAdmin
      .from("sms_checkin_states")
      .select("*")
      .eq("profile_id", sub.profile_id)
      .eq("checkin_date", localDate)
      .maybeSingle();

    // No active conversation or already completed → generic coach reply
    if (!state || state.stage === "completed" || state.stage === "idle") {
      const reply = await generateCoachSms({
        firstName,
        goalWhy: profile?.goal_why,
        instruction:
          "The client sent a message outside of an active check-in conversation. Reply naturally and supportively. If they seem to be reporting workout or calorie info, acknowledge it warmly.",
        context: { inboundText: body },
        fallback: `Got your message, ${firstName}! If you need to log today's check-in, I'll text you this evening.`,
      });

      await sendAndLogSms({
        phone: from,
        body: reply,
        profileId: sub.profile_id,
        userId: sub.user_id,
        kind: "coach_reply",
        extra: { freeform: true },
      });
      return twiml();
    }

    // ─── Stage: asked_workout ─────────────────────────────

    if (state.stage === "asked_workout") {
      const yn = parseYesNo(body);

      if (yn === null) {
        // Can't parse — ask for clarification
        const clarify = await generateCoachSms({
          firstName,
          instruction:
            "The client replied to the workout question but I couldn't tell if they mean yes or no. Ask them to clarify with a simple yes or no. Keep it friendly and brief.",
          context: { inboundText: body },
          fallback: `Hey ${firstName}, I need a quick yes or no on that one — did you work out today?`,
        });

        await sendAndLogSms({
          phone: from,
          body: clarify,
          profileId: sub.profile_id,
          userId: sub.user_id,
          kind: "clarification",
          extra: { stage: "asked_workout" },
        });
        return twiml();
      }

      // Save workout answer, advance to asked_calories
      await supabaseAdmin
        .from("sms_checkin_states")
        .update({
          did_workout: yn,
          stage: "asked_calories",
          last_message_at: nowIso,
        })
        .eq("id", state.id);

      try {
        await upsertDailyCheckinPatch({
          profileId: sub.profile_id,
          checkinDate: localDate,
          patch: { did_workout: yn },
        });
      } catch (err: any) {
        console.error("[sms/webhook] daily_checkins patch error:", err?.message);
      }

      // Generate response that transitions to calorie question
      const reply = await generateCoachSms({
        firstName,
        goalWhy: profile?.goal_why,
        instruction: yn
          ? "The client confirmed they worked out today. Acknowledge it positively (1 sentence max). Then ask if they stayed close to their calorie target today. Expect a yes/no reply."
          : "The client said they didn't work out today. Be supportive and understanding (1 sentence max). Then ask if they stayed close to their calorie target today. Expect a yes/no reply.",
        fallback: yn
          ? `Nice work getting that in today! Quick one more — did you stay close to your calorie target? (yes/no)`
          : `No worries at all. Quick question — did you stay close to your calorie target today? (yes/no)`,
      });

      await sendAndLogSms({
        phone: from,
        body: reply,
        profileId: sub.profile_id,
        userId: sub.user_id,
        kind: "coach_reply",
        extra: { stage: "asked_calories", did_workout: yn },
      });
      return twiml();
    }

    // ─── Stage: asked_calories ────────────────────────────

    if (state.stage === "asked_calories") {
      const yn = parseYesNo(body);

      if (yn === null) {
        const clarify = await generateCoachSms({
          firstName,
          instruction:
            "The client replied to the calorie question but I couldn't tell if they mean yes or no. Ask them to clarify with a simple yes or no. Keep it friendly and brief.",
          context: { inboundText: body },
          fallback: `Quick yes or no — did you stay close to your calorie target today?`,
        });

        await sendAndLogSms({
          phone: from,
          body: clarify,
          profileId: sub.profile_id,
          userId: sub.user_id,
          kind: "clarification",
          extra: { stage: "asked_calories" },
        });
        return twiml();
      }

      // Save calorie answer, mark completed
      await supabaseAdmin
        .from("sms_checkin_states")
        .update({
          hit_calorie_goal: yn,
          stage: "completed",
          last_message_at: nowIso,
        })
        .eq("id", state.id);

      try {
        await upsertDailyCheckinPatch({
          profileId: sub.profile_id,
          checkinDate: localDate,
          patch: { hit_calorie_goal: yn },
        });
      } catch (err: any) {
        console.error("[sms/webhook] daily_checkins patch error:", err?.message);
      }

      // Build wrap-up based on both answers
      const didWorkout = state.did_workout ?? false;
      const hitCalories = yn;

      let wrapInstruction: string;
      if (didWorkout && hitCalories) {
        wrapInstruction =
          "The client worked out AND hit their calories today. Give a short, genuinely enthusiastic wrap-up. Mention stacking good days. Don't overdo it.";
      } else if (didWorkout && !hitCalories) {
        wrapInstruction =
          "The client worked out but didn't hit calories. Acknowledge the workout positively, and be casual about the food — tomorrow's a new chance. Keep it real.";
      } else if (!didWorkout && hitCalories) {
        wrapInstruction =
          "The client didn't work out but hit their calories. Acknowledge the calorie win. Be understanding about the workout. Tomorrow's a fresh start.";
      } else {
        wrapInstruction =
          "Neither workout nor calories hit today. Be genuinely supportive — one day doesn't define them. Frame it as data, not a verdict. We reset tomorrow.";
      }

      const wrapUp = await generateCoachSms({
        firstName,
        goalWhy: profile?.goal_why,
        pastStruggles: profile?.past_struggles,
        instruction: wrapInstruction + " This is the end of the check-in, so don't ask any more questions.",
        fallback: didWorkout && hitCalories
          ? `Dialed-in day, ${firstName}. Keep stacking these. See you tomorrow.`
          : didWorkout
            ? `Workout done, that's a win. Food can be a work in progress. We go again tomorrow.`
            : hitCalories
              ? `Calories on point — that counts for a lot. We'll get the workout in next time.`
              : `Today wasn't perfect but you're still showing up by checking in. We reset tomorrow.`,
      });

      await sendAndLogSms({
        phone: from,
        body: wrapUp,
        profileId: sub.profile_id,
        userId: sub.user_id,
        kind: "checkin_wrapup",
        extra: { did_workout: didWorkout, hit_calorie_goal: hitCalories },
      });
      return twiml();
    }

    // ─── Fallback for unexpected stages ───────────────────

    const fallback = await generateCoachSms({
      firstName,
      instruction:
        "The client sent a message but there's no clear question pending. Reply naturally and let them know you'll check in later.",
      context: { inboundText: body },
      fallback: `Got it, ${firstName}. I'll check in with you later today!`,
    });

    await sendAndLogSms({
      phone: from,
      body: fallback,
      profileId: sub.profile_id,
      userId: sub.user_id,
      kind: "coach_reply",
      extra: { stage: state.stage },
    });
    return twiml();
  } catch (err: any) {
    console.error("[sms/webhook] route error:", err?.message || err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
