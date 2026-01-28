// app/api/sms/webhook/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { sendSms, verifyTwilioSignature, getTwilioFromNumber } from "../../../lib/twilioServer";

export const runtime = "nodejs";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function toParams(rawBody: string): Record<string, string> {
  const sp = new URLSearchParams(rawBody);
  const out: Record<string, string> = {};
  for (const [k, v] of sp.entries()) out[k] = v;
  return out;
}

function isStop(body: string) {
  const t = body.trim().toUpperCase();
  return ["STOP", "STOPALL", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"].includes(t);
}

function isHelp(body: string) {
  const t = body.trim().toUpperCase();
  return ["HELP", "INFO"].includes(t);
}

function isStart(body: string) {
  const t = body.trim().toUpperCase();
  return ["START", "UNSTOP", "YES"].includes(t);
}

function parseYesNo(body: string): boolean | null {
  const t = body.trim().toLowerCase();
  if (["y", "yes", "yeah", "yep", "done", "did", "sure"].includes(t)) return true;
  if (["n", "no", "nope", "nah", "not", "didn't", "didnt"].includes(t)) return false;
  return null;
}

function parseRating(body: string): number | null {
  const m = body.trim().match(/\b([1-9]|10)\b/);
  if (!m) return null;
  const n = Number(m[1]);
  if (Number.isNaN(n) || n < 1 || n > 10) return null;
  return n;
}

function safeLog(msg: string, meta?: Record<string, unknown>) {
  // Avoid logging tokens; this only logs high-level info.
  console.log(`[sms/webhook] ${msg}`, meta ? meta : "");
}

async function upsertDailyCheckinPatch(args: {
  profileId: string;
  checkinDate: string; // YYYY-MM-DD
  patch: Partial<{
    did_workout: boolean;
    hit_calorie_goal: boolean;
    workout_rating: number;
    notes: string;
    weight_kg: number;
  }>;
}) {
  // Avoid "upsert overwriting with null" by doing select + update/insert.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("daily_checkins")
    .select("id")
    .eq("profile_id", args.profileId)
    .eq("checkin_date", args.checkinDate)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to check daily_checkins existing row: ${existingError.message}`);
  }

  const patch = { ...args.patch, updated_at: new Date().toISOString() } as any;

  if (existing?.id) {
    const { error: updErr } = await supabaseAdmin
      .from("daily_checkins")
      .update(patch)
      .eq("id", existing.id);

    if (updErr) throw new Error(`Failed to update daily_checkins: ${updErr.message}`);
    return { created: false };
  }

  const { error: insErr } = await supabaseAdmin.from("daily_checkins").insert({
    profile_id: args.profileId,
    checkin_date: args.checkinDate,
    ...patch,
  });

  if (insErr) throw new Error(`Failed to insert daily_checkins: ${insErr.message}`);
  return { created: true };
}

async function generateCoachReply(args: {
  firstName: string;
  inboundText: string;
  context: Record<string, unknown>;
}) {
  const system = `
You are Motivo's SMS coach. You are supportive, concise, and practical.
- No marketing.
- No medical advice.
- Keep replies under 400 characters whenever possible.
- If user's message is unclear, ask ONE clarifying question.
`.trim();

  const payload = {
    firstName: args.firstName,
    inboundText: args.inboundText,
    context: args.context,
  };

  const aiRes = await openai.responses.create({
    model: OPENAI_MODEL,
    input: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(payload) },
    ],
  });

  const out0: any = (aiRes.output?.[0] as any) ?? null;
  const c0: any = out0?.content?.[0] ?? null;
  const text = typeof c0?.text === "string" ? c0.text.trim() : "";
  return text || "Got it. Want to share one quick detail so I can log this correctly?";
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const params = toParams(rawBody);

    const okSig = verifyTwilioSignature({ req, params });
    if (!okSig) {
      safeLog("Signature verification failed", { hasSig: !!req.headers.get("x-twilio-signature") });
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const from = (params["From"] || "").trim(); // E.164 from Twilio
    const to = (params["To"] || "").trim();
    const body = (params["Body"] || "").trim();
    const messageSid = (params["MessageSid"] || "").trim();

    if (!from || !body) {
      return NextResponse.json({ error: "Missing From/Body" }, { status: 400 });
    }

    // Find subscription by phone
    const { data: sub, error: subErr } = await supabaseAdmin
      .from("sms_subscriptions")
      .select("*")
      .eq("phone_e164", from)
      .maybeSingle();

    if (subErr) {
      console.error("webhook: subscription lookup error:", subErr.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    if (!sub) {
      // Unknown phone — do not leak info. Provide neutral reply.
      safeLog("Unknown phone inbound", { from, sid: messageSid });
      // Reply with a safe message
      await sendSms(from, "Hi! This number isn’t linked to a Motivo account. If you think this is a mistake, contact support in the app.");
      return new NextResponse("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    // Store inbound message
    const inboundInsert = await supabaseAdmin.from("sms_messages").insert({
      profile_id: sub.profile_id,
      user_id: sub.user_id,
      direction: "inbound",
      from_number: from,
      to_number: to,
      body,
      twilio_message_sid: messageSid || null,
      metadata: { kind: "inbound_webhook" },
    });

    if (inboundInsert.error) {
      console.error("webhook: inbound store error:", inboundInsert.error.message);
      // continue; not fatal
    }

    const nowIso = new Date().toISOString();

    // STOP / HELP / START handling
    if (isStop(body)) {
      await supabaseAdmin.from("sms_subscriptions").update({
        status: "stopped",
        opted_out_at: nowIso,
        updated_at: nowIso,
        pending_question: null,
        pending_checkin_date: null,
        pending_sent_at: null,
        pending_attempts: 0,
      }).eq("id", sub.id);

      await supabaseAdmin.from("client_profiles").update({
        sms_checkins_enabled: false,
        allow_sms_checkins: false,
        // sms_opt_out_at: nowIso, // if you added minimal fields
      }).eq("id", sub.profile_id);

      const reply = "You’re unsubscribed from Motivo SMS coaching. Reply START to re-enable. (Msg & data rates may apply.)";
      const sent = await sendSms(from, reply);

      await supabaseAdmin.from("sms_messages").insert({
        profile_id: sub.profile_id,
        user_id: sub.user_id,
        direction: "outbound",
        from_number: getTwilioFromNumber(),
        to_number: from,
        body: reply,
        twilio_message_sid: sent.sid,
        twilio_status: sent.status ?? null,
        metadata: { kind: "stop_reply" },
      });

      return new NextResponse("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    if (isHelp(body)) {
      const reply =
        "Motivo SMS Coaching Help:\n" +
        "- Reply STOP to unsubscribe\n" +
        "- Reply START to re-enable\n" +
        "We send 2–4 automated check-ins/day (workouts + calories).\n" +
        "Msg & data rates may apply.";
      const sent = await sendSms(from, reply);

      await supabaseAdmin.from("sms_messages").insert({
        profile_id: sub.profile_id,
        user_id: sub.user_id,
        direction: "outbound",
        from_number: getTwilioFromNumber(),
        to_number: from,
        body: reply,
        twilio_message_sid: sent.sid,
        twilio_status: sent.status ?? null,
        metadata: { kind: "help_reply" },
      });

      return new NextResponse("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    if (isStart(body)) {
      await supabaseAdmin.from("sms_subscriptions").update({
        status: "active",
        opted_out_at: null,
        updated_at: nowIso,
      }).eq("id", sub.id);

      await supabaseAdmin.from("client_profiles").update({
        sms_checkins_enabled: true,
        allow_sms_checkins: true,
      }).eq("id", sub.profile_id);

      const reply =
        "Motivo SMS coaching is back on ✅\n" +
        "You’ll receive 2–4 automated check-ins/day.\n" +
        "Reply STOP to unsubscribe. Reply HELP for help.\n" +
        "Msg & data rates may apply.";
      const sent = await sendSms(from, reply);

      await supabaseAdmin.from("sms_messages").insert({
        profile_id: sub.profile_id,
        user_id: sub.user_id,
        direction: "outbound",
        from_number: getTwilioFromNumber(),
        to_number: from,
        body: reply,
        twilio_message_sid: sent.sid,
        twilio_status: sent.status ?? null,
        metadata: { kind: "start_reply" },
      });

      return new NextResponse("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    // If stopped, don’t coach further
    if (sub.status !== "active") {
      const reply = "SMS coaching is currently off. Reply START to re-enable or open Settings in the app.";
      const sent = await sendSms(from, reply);

      await supabaseAdmin.from("sms_messages").insert({
        profile_id: sub.profile_id,
        user_id: sub.user_id,
        direction: "outbound",
        from_number: getTwilioFromNumber(),
        to_number: from,
        body: reply,
        twilio_message_sid: sent.sid,
        twilio_status: sent.status ?? null,
        metadata: { kind: "inactive_reply" },
      });

      return new NextResponse("<Response></Response>", { status: 200, headers: { "Content-Type": "text/xml" } });
    }

    // Load profile basics for coach personalization
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("client_profiles")
      .select("first_name, timezone")
      .eq("id", sub.profile_id)
      .single();

    if (profErr) {
      console.error("webhook: profile lookup error:", profErr.message);
    }

    const firstName = profile?.first_name || "there";

    // Update subscription last inbound
    await supabaseAdmin.from("sms_subscriptions").update({
      last_inbound_at: nowIso,
      updated_at: nowIso,
    }).eq("id", sub.id);

    // Interpret based on pending question
    let patch: any = null;
    let interpreted = false;

    const pendingQuestion = sub.pending_question as string | null;
    const checkinDate = sub.pending_checkin_date as string | null;

    if (pendingQuestion && checkinDate) {
      if (pendingQuestion === "workout") {
        const yn = parseYesNo(body);
        if (yn !== null) {
          patch = { did_workout: yn };
          interpreted = true;
        }
      } else if (pendingQuestion === "calories") {
        const yn = parseYesNo(body);
        if (yn !== null) {
          patch = { hit_calorie_goal: yn };
          interpreted = true;
        }
      } else if (pendingQuestion === "rating") {
        const r = parseRating(body);
        if (r !== null) {
          patch = { workout_rating: r };
          interpreted = true;
        }
      } else if (pendingQuestion === "notes") {
        patch = { notes: body };
        interpreted = true;
      }

      if (interpreted && patch) {
        try {
          await upsertDailyCheckinPatch({
            profileId: sub.profile_id,
            checkinDate,
            patch,
          });

          // Clear pending question
          await supabaseAdmin.from("sms_subscriptions").update({
            pending_question: null,
            pending_checkin_date: null,
            pending_sent_at: null,
            pending_attempts: 0,
            updated_at: nowIso,
          }).eq("id", sub.id);
        } catch (e: any) {
          console.error("webhook: daily_checkins update error:", e?.message || e);
        }
      }
    }

    // Coach reply (OpenAI)
    const replyText = await generateCoachReply({
      firstName,
      inboundText: body,
      context: {
        interpreted,
        pendingQuestion,
        checkinDate,
        patch,
      },
    });

    const sent = await sendSms(from, replyText);

    await supabaseAdmin.from("sms_messages").insert({
      profile_id: sub.profile_id,
      user_id: sub.user_id,
      direction: "outbound",
      from_number: getTwilioFromNumber(),
      to_number: from,
      body: replyText,
      twilio_message_sid: sent.sid,
      twilio_status: sent.status ?? null,
      metadata: { kind: "coach_reply", interpreted, pendingQuestion },
    });

    // Update subscription last outbound
    await supabaseAdmin.from("sms_subscriptions").update({
      last_outbound_at: nowIso,
      updated_at: nowIso,
    }).eq("id", sub.id);

    return new NextResponse("<Response></Response>", {
      status: 200,
      headers: { "Content-Type": "text/xml" },
    });
  } catch (err) {
    console.error("sms/webhook route error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
