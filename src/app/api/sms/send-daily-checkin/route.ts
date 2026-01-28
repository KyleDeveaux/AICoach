// app/api/sms/send-daily-checkins/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { sendSms, getTwilioFromNumber } from "../../../lib/twilioServer";

export const runtime = "nodejs";

const MIN_PER_DAY = Number(process.env.SMS_DAILY_MIN || 2);
const MAX_PER_DAY = Number(process.env.SMS_DAILY_MAX || 4);

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getLocalParts(timeZone: string) {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  // en-CA gives YYYY-MM-DD format for date parts
  const parts = dtf.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour"));
  return { date, hour, nowIso: now.toISOString() };
}

function pickPrompt(hour: number) {
  // Best-practice windows:
  // - Morning: 8–11 local
  // - Evening: 18–21 local
  if (hour >= 8 && hour <= 11) return "workout";
  if (hour >= 18 && hour <= 21) return "calories";
  return null;
}

function promptText(kind: "workout" | "calories", firstName: string) {
  if (kind === "workout") {
    return `Morning ${firstName} 👊 Did you get a workout in today? Reply YES or NO. (STOP to unsubscribe, HELP for help)`;
  }
  return `Quick check-in ${firstName}: did you stay close to your calorie goal today? Reply YES or NO. (STOP to unsubscribe, HELP for help)`;
}

function followupText(kind: "workout" | "calories", firstName: string) {
  if (kind === "workout") {
    return `Just checking in ${firstName} — workout today? Reply YES or NO so I can log it.`;
  }
  return `One more quick one ${firstName} — did you hit your calories today? Reply YES or NO so I can log it.`;
}

export async function POST(req: Request) {
  try {
    const auth =
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
      req.headers.get("x-cron-secret");

    if (!auth || auth !== process.env.CRON_SECRET) {
      return jsonError("Unauthorized", 401);
    }

    const { data: subs, error: subsErr } = await supabaseAdmin
      .from("sms_subscriptions")
      .select("id, profile_id, user_id, phone_e164, status, timezone, daily_sent_date, daily_sent_count, pending_question, pending_checkin_date, pending_sent_at, pending_attempts")
      .eq("status", "active");

    if (subsErr) {
      console.error("cron: load subscriptions error:", subsErr.message);
      return jsonError("Failed to load subscriptions", 500);
    }

    let sentCount = 0;

    for (const sub of subs ?? []) {
      try {
        const { data: profile, error: profErr } = await supabaseAdmin
          .from("client_profiles")
          .select("first_name, timezone")
          .eq("id", sub.profile_id)
          .single();

        if (profErr || !profile) {
          console.error("cron: profile load failed:", profErr?.message);
          continue;
        }

        const tz = sub.timezone || profile.timezone || process.env.DEFAULT_TIMEZONE || "UTC";
        const { date: localDate, hour, nowIso } = getLocalParts(tz);

        // Reset daily counters if new day
        if (sub.daily_sent_date !== localDate) {
          await supabaseAdmin.from("sms_subscriptions").update({
            daily_sent_date: localDate,
            daily_sent_count: 0,
            pending_attempts: 0,
            // Don’t clear pending_question automatically; user might reply late.
            // But if you want strict daily separation, you can clear pending here.
            updated_at: nowIso,
          }).eq("id", sub.id);

          sub.daily_sent_date = localDate;
          sub.daily_sent_count = 0;
        }

        const currentCount = Number(sub.daily_sent_count || 0);
        if (currentCount >= MAX_PER_DAY) continue;

        const firstName = profile.first_name || "there";

        // Follow-up if pending and enough time passed
        if (sub.pending_question && sub.pending_checkin_date && sub.pending_sent_at) {
          const pendingKind = sub.pending_question as "workout" | "calories";
          const attempts = Number(sub.pending_attempts || 0);

          const sentAt = new Date(sub.pending_sent_at).getTime();
          const now = Date.now();
          const hoursSince = (now - sentAt) / (1000 * 60 * 60);

          if (attempts < 2 && hoursSince >= 2 && currentCount < MAX_PER_DAY) {
            const txt = followupText(pendingKind, firstName);
            const sent = await sendSms(sub.phone_e164, txt);

            await supabaseAdmin.from("sms_messages").insert({
              profile_id: sub.profile_id,
              user_id: sub.user_id,
              direction: "outbound",
              from_number: getTwilioFromNumber(),
              to_number: sub.phone_e164,
              body: txt,
              twilio_message_sid: sent.sid,
              twilio_status: sent.status ?? null,
              metadata: { kind: "followup", prompt: pendingKind, checkin_date: sub.pending_checkin_date },
            });

            await supabaseAdmin.from("sms_subscriptions").update({
              daily_sent_date: localDate,
              daily_sent_count: currentCount + 1,
              pending_attempts: attempts + 1,
              last_outbound_at: nowIso,
              updated_at: nowIso,
            }).eq("id", sub.id);

            sentCount += 1;
          }

          continue;
        }

        // No pending question — send base prompts (ensure minimum 2/day)
        const kind = pickPrompt(hour);
        if (!kind) continue;

        // Only send morning prompt if we’re still below MIN_PER_DAY (or even if above, but still under MAX and within windows)
        if (currentCount >= MAX_PER_DAY) continue;

        const txt = promptText(kind, firstName);
        const sent = await sendSms(sub.phone_e164, txt);

        await supabaseAdmin.from("sms_messages").insert({
          profile_id: sub.profile_id,
          user_id: sub.user_id,
          direction: "outbound",
          from_number: getTwilioFromNumber(),
          to_number: sub.phone_e164,
          body: txt,
          twilio_message_sid: sent.sid,
          twilio_status: sent.status ?? null,
          metadata: { kind: "daily_prompt", prompt: kind, checkin_date: localDate },
        });

        await supabaseAdmin.from("sms_subscriptions").update({
          daily_sent_date: localDate,
          daily_sent_count: currentCount + 1,
          pending_question: kind,
          pending_checkin_date: localDate,
          pending_sent_at: nowIso,
          pending_attempts: 0,
          last_outbound_at: nowIso,
          updated_at: nowIso,
        }).eq("id", sub.id);

        sentCount += 1;
      } catch (e: any) {
        console.error("cron: per-sub error:", e?.message || e);
      }
    }

    return NextResponse.json({ ok: true, sentCount, minPerDay: MIN_PER_DAY, maxPerDay: MAX_PER_DAY });
  } catch (err) {
    console.error("send-daily-checkins route error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
