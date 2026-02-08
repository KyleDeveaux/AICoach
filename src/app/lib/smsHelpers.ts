// lib/smsHelpers.ts
// Shared SMS utilities for the cron and webhook routes.

import OpenAI from "openai";
import { supabaseAdmin } from "./supabaseAdmin";
import { sendSms, getTwilioFromNumber } from "./twilioServer";
import type { WeeklyWorkoutSession } from "./types";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

// ─── Time helpers ───────────────────────────────────────────

export function getLocalTimeParts(timeZone: string) {
  const now = new Date();
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(now);
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour"));

  // Get day name in user's timezone
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
  }).format(now);

  return { date, hour, dayName };
}

// ─── Workout helpers ────────────────────────────────────────

export function getTodayWorkout(
  schedule: WeeklyWorkoutSession[],
  dayName: string
): WeeklyWorkoutSession | null {
  return schedule.find((s) => s.dayOfWeek === dayName) ?? null;
}

export function buildWorkoutSummary(session: WeeklyWorkoutSession): string {
  const exercises = session.exercises.slice(0, 4);
  if (exercises.length === 0) return session.workoutName;
  const lines = exercises.map((ex) => `${ex.name} ${ex.sets}x${ex.reps}`);
  return `${session.workoutName}:\n${lines.join("\n")}`;
}

// ─── LLM coach ──────────────────────────────────────────────

const COACH_SYSTEM_PROMPT = `You are a fitness coach texting a client via SMS. Sound like a real human coach — casual, warm, direct.
Rules:
- No corporate speak, no marketing language
- Keep messages under 300 characters
- One emoji max per message
- Use their first name naturally (not every message)
- Never give medical advice
- Return ONLY the SMS text, nothing else`;

export async function generateCoachSms(args: {
  firstName: string;
  goalWhy?: string | null;
  pastStruggles?: string | null;
  instruction: string;
  context?: Record<string, unknown>;
  fallback: string;
}): Promise<string> {
  const userPayload: Record<string, unknown> = {
    firstName: args.firstName,
    instruction: args.instruction,
  };
  if (args.goalWhy) userPayload.goalWhy = args.goalWhy;
  if (args.pastStruggles) userPayload.pastStruggles = args.pastStruggles;
  if (args.context) Object.assign(userPayload, args.context);

  try {
    const res = await openai.responses.create({
      model: OPENAI_MODEL,
      input: [
        { role: "system", content: COACH_SYSTEM_PROMPT },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    });

    const out0 = (res.output?.[0] as any) ?? null;
    const c0 = (out0?.content?.[0] as any) ?? null;
    const text = typeof c0?.text === "string" ? c0.text.trim() : "";
    return text || args.fallback;
  } catch (err) {
    console.error("[smsHelpers] LLM error:", err);
    return args.fallback;
  }
}

// ─── Message logging ────────────────────────────────────────

export async function logSmsMessage(args: {
  profileId: string;
  userId: string;
  direction: "inbound" | "outbound";
  from: string;
  to: string;
  body: string;
  sid?: string | null;
  status?: string | null;
  kind: string;
  extra?: Record<string, unknown>;
}) {
  const { error } = await supabaseAdmin.from("sms_messages").insert({
    profile_id: args.profileId,
    user_id: args.userId,
    direction: args.direction,
    from_number: args.from,
    to_number: args.to,
    body: args.body,
    twilio_message_sid: args.sid ?? null,
    twilio_status: args.status ?? null,
    metadata: { kind: args.kind, ...args.extra },
  });
  if (error) {
    console.error("[smsHelpers] logSmsMessage error:", error.message);
  }
}

// ─── Send + log shorthand ───────────────────────────────────

export async function sendAndLogSms(args: {
  phone: string;
  body: string;
  profileId: string;
  userId: string;
  kind: string;
  extra?: Record<string, unknown>;
}) {
  const sent = await sendSms(args.phone, args.body);
  await logSmsMessage({
    profileId: args.profileId,
    userId: args.userId,
    direction: "outbound",
    from: getTwilioFromNumber(),
    to: args.phone,
    body: args.body,
    sid: sent.sid,
    status: sent.status,
    kind: args.kind,
    extra: args.extra,
  });
  return sent;
}

// ─── Yes/No parser ──────────────────────────────────────────

export function parseYesNo(body: string): boolean | null {
  const t = body.trim().toLowerCase();
  if (["y", "yes", "yeah", "yep", "done", "did", "sure", "yea"].includes(t))
    return true;
  if (
    ["n", "no", "nope", "nah", "not", "didn't", "didnt", "skip"].includes(t)
  )
    return false;
  return null;
}

// ─── Daily checkin patch (upsert without overwriting nulls) ─

export async function upsertDailyCheckinPatch(args: {
  profileId: string;
  checkinDate: string;
  patch: Partial<{
    did_workout: boolean;
    hit_calorie_goal: boolean;
    workout_rating: number;
    notes: string;
    weight_kg: number;
  }>;
}) {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("daily_checkins")
    .select("id")
    .eq("profile_id", args.profileId)
    .eq("checkin_date", args.checkinDate)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `daily_checkins lookup error: ${existingError.message}`
    );
  }

  const patch = { ...args.patch, updated_at: new Date().toISOString() } as any;

  if (existing?.id) {
    const { error } = await supabaseAdmin
      .from("daily_checkins")
      .update(patch)
      .eq("id", existing.id);
    if (error) throw new Error(`daily_checkins update error: ${error.message}`);
    return;
  }

  const { error } = await supabaseAdmin.from("daily_checkins").insert({
    profile_id: args.profileId,
    checkin_date: args.checkinDate,
    ...patch,
  });
  if (error) throw new Error(`daily_checkins insert error: ${error.message}`);
}
