// src/app/api/twilio/inbound/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";
import { getTodayLocalDate } from "@/app/lib/utils";
import type { DailyCheckinInsert } from "@/app/lib/types";

// Optional: tiny helper to normalize phone format if you ever need to tweak it later
function normalizePhoneNumber(raw: string | null): string | null {
  if (!raw) return null;
  // Twilio sends E.164 like "+15551234567" – we'll just trim spaces for now.
  return raw.trim();
}

type ParsedSmsCheckin = {
  didWorkout: boolean | null;
  hitCalories: boolean | null;
  rating: number | null;
  notes: string | null;
};

// Parse "WORKOUT: yes\nCALORIES: no\nRATING: 7\nNOTES: ..." style
function parseKeyValueStyle(body: string): ParsedSmsCheckin | null {
  const text = body.trim();

  const boolFrom = (val: string | undefined | null): boolean | null => {
    if (!val) return null;
    const v = val.toLowerCase();
    if (v === "yes" || v === "y") return true;
    if (v === "no" || v === "n") return false;
    return null;
  };

  const workoutMatch = text.match(/workout\s*:\s*(yes|no|y|n)/i);
  const caloriesMatch = text.match(/calories?\s*:\s*(yes|no|y|n)/i);
  const ratingMatch = text.match(/rating\s*:\s*(\d{1,2})/i);
  const notesMatch = text.match(/notes?\s*:\s*([\s\S]+)$/i);


  if (!workoutMatch && !caloriesMatch && !ratingMatch && !notesMatch) {
    return null; // doesn't look like key-value style
  }

  const rawRating = ratingMatch ? parseInt(ratingMatch[1], 10) : NaN;
  const rating =
    !isNaN(rawRating) && rawRating >= 1 && rawRating <= 10
      ? rawRating
      : null;

  return {
    didWorkout: boolFrom(workoutMatch?.[1]),
    hitCalories: boolFrom(caloriesMatch?.[1]),
    rating,
    notes: notesMatch ? notesMatch[1].trim() : null,
  };
}

// Parse compact "Y N 7 felt tired" style
function parseCompactStyle(body: string): ParsedSmsCheckin | null {
  const text = body.trim();

  // Y/N Y/N [rating] [notes...]
  const match = text.match((
    /^\s*([YyNn])\s+([YyNn])(?:\s+(\d{1,2}))?(?:\s+([\s\S]+))?$/i)
  );
  if (!match) return null;

  const ynToBool = (ch: string): boolean => /[Yy]/.test(ch);

  const didWorkout = ynToBool(match[1]);
  const hitCalories = ynToBool(match[2]);

  let rating: number | null = null;
  if (match[3]) {
    const n = parseInt(match[3], 10);
    if (!isNaN(n) && n >= 1 && n <= 10) rating = n;
  }

  const notes = match[4] ? match[4].trim() : null;

  return { didWorkout, hitCalories, rating, notes };
}

function parseSmsBody(body: string): ParsedSmsCheckin | null {
  // Try key-value first (more explicit)
  const kv = parseKeyValueStyle(body);
  if (kv) return kv;

  // Fall back to compact form
  const compact = parseCompactStyle(body);
  if (compact) return compact;

  return null;
}

// Simple helper to send TwiML responses
function twimlMessage(message: string): NextResponse {
  const twiml = `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
      <Message>${message}</Message>
    </Response>
  `.trim();

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml",
    },
  });
}

// Handy GET handler so you can test in the browser
export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Twilio inbound route is alive 🚀",
  });
}

// Twilio will call this with POST
export async function POST(req: NextRequest) {
  try {
    // Twilio sends x-www-form-urlencoded
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const rawFrom = params.get("From");
    const from = normalizePhoneNumber(rawFrom);
    const body = params.get("Body") || "";

    console.log("📩 Incoming SMS from Twilio:", { from, body });

    if (!from) {
      return twimlMessage(
        "We couldn't read your phone number. Please try again."
      );
    }

    // 1) Look up client profile by phone number
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("*")
      .eq("phone_number", from)
      .eq("allow_sms_checkins", true)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile for SMS check-in:", profileError);
      return twimlMessage(
        "Sorry, there was an error looking up your profile. Please try again later."
      );
    }

    if (!profile) {
      console.warn("No SMS-enabled profile found for phone:", from);
      return twimlMessage(
        "We don't recognize this phone number for SMS check-ins. " +
          "Please check your settings in the app."
      );
    }

    // 2) Parse the SMS body into check-in fields
    const parsed = parseSmsBody(body);

    if (!parsed || parsed.didWorkout === null || parsed.hitCalories === null) {
      return twimlMessage(
        "I couldn't understand that. Reply like:\n" +
          'WORKOUT: yes/no\nCALORIES: yes/no\nRATING: 7\nNOTES: quick recap\n\n' +
          "Or simply: Y N 7 felt tired"
      );
    }

    const todayIso = getTodayLocalDate(); // same helper you use on the frontend

    const payload: DailyCheckinInsert = {
      profile_id: profile.id,
      checkin_date: todayIso,
      did_workout: parsed.didWorkout,
      hit_calorie_goal: parsed.hitCalories,
      workout_rating: parsed.rating ?? null,
      weight_kg: null,
      notes: parsed.notes ?? null,
    };

    // 3) Upsert into daily_checkins so we don't duplicate a day
    const { error: upsertError } = await supabase
      .from("daily_checkins")
      .upsert(payload, {
        onConflict: "profile_id,checkin_date",
      });

    if (upsertError) {
      console.error("Error upserting daily_checkins via SMS:", upsertError);
      return twimlMessage(
        "Something went wrong saving your check-in. Please try again later."
      );
    }

    // 4) Friendly confirmation back to the client
    const workoutText = parsed.didWorkout ? "✅ Workout logged" : "❌ No workout";
    const caloriesText = parsed.hitCalories
      ? "✅ Calories on target"
      : "❌ Calories off target";

    const ratingText =
      parsed.rating != null ? `Rating: ${parsed.rating}/10. ` : "";

    return twimlMessage(
      `${workoutText}, ${caloriesText}. ${ratingText}Your check-in for today is saved.`
    );
  } catch (err) {
    console.error("❌ Error in Twilio inbound handler:", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
