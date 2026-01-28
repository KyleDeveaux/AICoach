// app/api/sms/opt-in/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { sendSms, getTwilioFromNumber } from "../../../lib/twilioServer";

export const runtime = "nodejs";

function normalizePhoneNumberToE164(raw: string): string | null {
  const trimmed = (raw || "").trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (trimmed.startsWith("+") && digits.length >= 8) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function welcomeMessage() {
  return (
    "Welcome to Motivo SMS coaching 💪\n\n" +
    "I’ll send 2–4 automated check-ins per day (workouts + calories) and log your progress.\n" +
    "Reply STOP to unsubscribe. Reply HELP for help.\n" +
    "Msg & data rates may apply."
  );
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return jsonError("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    const profileId = body?.profileId as string | undefined;
    const phoneRaw = body?.phone as string | undefined;
    const consentChecked = body?.consentChecked as boolean | undefined;
    const source = (body?.source as string | undefined) ?? "unknown";

    if (!profileId || typeof profileId !== "string") {
      return jsonError("Missing profileId");
    }
    if (!consentChecked) {
      return jsonError("Consent checkbox must be checked to enable SMS.");
    }

    // Verify profile belongs to logged-in user
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("id, user_id, sms_phone_number, phone_number, timezone")
      .eq("id", profileId)
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("opt-in: profile lookup failed:", profileError?.message);
      return jsonError("Profile not found", 404);
    }

    const candidatePhone =
      phoneRaw ?? profile.sms_phone_number ?? profile.phone_number ?? "";
    const phoneE164 = normalizePhoneNumberToE164(candidatePhone);
    if (!phoneE164) {
      return jsonError("Invalid phone number. Please enter a valid number (E.164 preferred).");
    }

    const tz = profile.timezone ?? process.env.DEFAULT_TIMEZONE ?? "UTC";

    // Update profile flags (canonical: sms_checkins_enabled)
    const { error: updateProfileError } = await supabaseAdmin
      .from("client_profiles")
      .update({
        sms_phone_number: phoneE164,
        allow_sms_checkins: true,
        sms_checkins_enabled: true,
        // minimal audit fields if you added them:
        // sms_opt_in_at: new Date().toISOString(),
        // sms_opt_out_at: null,
      })
      .eq("id", profileId);

    if (updateProfileError) {
      console.error("opt-in: update profile failed:", updateProfileError.message);
      return jsonError("Failed to enable SMS", 500);
    }

    // Upsert subscription
    const nowIso = new Date().toISOString();
    const { error: subError } = await supabaseAdmin
      .from("sms_subscriptions")
      .upsert(
        {
          profile_id: profileId,
          user_id: user.id,
          phone_e164: phoneE164,
          status: "active",
          opted_in_at: nowIso,
          opted_out_at: null,
          timezone: tz,
          consent_source: source,
          updated_at: nowIso,
        },
        { onConflict: "profile_id" }
      );

    if (subError) {
      console.error("opt-in: upsert subscription failed:", subError.message);
      return jsonError("Failed to create SMS subscription", 500);
    }

    // Send welcome text
    const msgBody = welcomeMessage();
    const sendResult = await sendSms(phoneE164, msgBody);

    // Store outbound message (don’t log tokens)
    const fromLabel = getTwilioFromNumber();
    const { error: msgInsertError } = await supabaseAdmin.from("sms_messages").insert({
      profile_id: profileId,
      user_id: user.id,
      direction: "outbound",
      from_number: fromLabel,
      to_number: phoneE164,
      body: msgBody,
      twilio_message_sid: sendResult.sid,
      twilio_status: sendResult.status ?? null,
      metadata: { kind: "welcome" },
    });

    if (msgInsertError) {
      console.error("opt-in: message insert failed:", msgInsertError.message);
      // Not fatal for user experience
    }

    return NextResponse.json({ ok: true, phone: phoneE164 });
  } catch (err) {
    console.error("opt-in route error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
