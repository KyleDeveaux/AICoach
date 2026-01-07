import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";
import { twilioClient, getTwilioFromConfig } from "@/app/lib/twilioClient";

export async function POST(req: Request) {
  try {
    const { profileId } = await req.json();

    if (!profileId) {
      return NextResponse.json(
        { error: "Missing profileId in request body." },
        { status: 400 }
      );
    }

    // 1️⃣ Load the profile from Supabase
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      console.error("Error loading profile for test SMS:", profileError);
      return NextResponse.json(
        { error: "Could not load profile for test SMS." },
        { status: 404 }
      );
    }

    // 2️⃣ Check that SMS is enabled & a normalized SMS phone exists
    if (!profile.sms_checkins_enabled) {
      return NextResponse.json(
        { error: "SMS check-ins are disabled for this profile." },
        { status: 400 }
      );
    }

    if (!profile.sms_phone_number) {
      return NextResponse.json(
        {
          error:
            "No SMS phone number on file. Please add one in Settings and enable SMS check-ins.",
        },
        { status: 400 }
      );
    }

    const { messagingServiceSid, fromNumber } = getTwilioFromConfig();

    // 3️⃣ Actually send the SMS
    await twilioClient.messages.create({
      to: profile.sms_phone_number, // ✅ this is the correct field
      body: "This is a test SMS from CoachIE 📲",
      ...(messagingServiceSid
        ? { messagingServiceSid }
        : { from: fromNumber }),
    });

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("Twilio error sending test SMS:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to send SMS: ${msg}` },
      { status: 500 }
    );
  }
}
