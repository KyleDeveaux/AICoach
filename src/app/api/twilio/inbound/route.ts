// app/api/twilio/inbound/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabaseClient";

type SmsCheckinStage = "asked_workout" | "asked_calories" | "completed";

interface SmsCheckinStateRow {
  id: string;
  profile_id: string;
  phone_number: string;
  checkin_date: string; // YYYY-MM-DD
  stage: SmsCheckinStage;
  did_workout: boolean | null;
  hit_calorie_goal: boolean | null;
  created_at: string;
  updated_at: string;
}

// Simple yes/no parser
function parseYesNo(text: string): boolean | null {
  const t = text.trim().toLowerCase();

  if (/(^|\s)(y|yes|yeah|yep|sure|of course|def|definitely)(\s|$)/i.test(t)) {
    return true;
  }
  if (/(^|\s)(n|no|nope|nah|not really)(\s|$)/i.test(t)) {
    return false;
  }
  return null;
}

function twimlMessage(message: string): Response {
  const xml = `<Response><Message>${message}</Message></Response>`;
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const from = formData.get("From")?.toString() ?? "";
    const body = formData.get("Body")?.toString() ?? "";

    if (!from) {
      // Twilio just needs a 200. We'll no-op.
      return twimlMessage("Hey! I couldn't see your number. Try again?");
    }

    // 1) Find the profile tied to this phone number
    const { data: profiles, error: profileError } = await supabase
      .from("client_profiles")
      .select("id, first_name, sms_phone_number")
      .eq("sms_phone_number", from)
      .maybeSingle();

    if (profileError || !profiles) {
      console.error("No profile found for phone:", from, profileError);
      return twimlMessage(
        "Hey! I don't recognize this number. Please update your phone in settings inside the app."
      );
    }

    const profile = profiles;
    const todayIso = new Date().toISOString().slice(0, 10);

    // 2) Get today's SMS check-in state
    const { data: stateRow, error: stateError } = await supabase
      .from("sms_checkin_states")
      .select("*")
      .eq("profile_id", profile.id)
      .eq("checkin_date", todayIso)
      .maybeSingle();

    if (stateError) {
      console.error("Error loading sms_checkin_states:", stateError);
      return twimlMessage(
        "Something went wrong on my side while logging this. Try again later."
      );
    }

    if (!stateRow || stateRow.stage === "completed") {
      // No active conversation for today. For now we just tell them it's not needed.
      return twimlMessage(
        "Hey! I don't have an open check-in for today. You'll get an evening text when it's time to log your day 💪"
      );
    }

    const state = stateRow as SmsCheckinStateRow;
    const yesNo = parseYesNo(body);

    if (yesNo === null) {
      // Not clearly yes/no → nudge them to answer that way
      return twimlMessage(
        "Got your message, but I need a simple YES or NO so I can log today correctly 💬"
      );
    }

    // 3) Handle stages
    if (state.stage === "asked_workout") {
      // Save did_workout, move to calories question
      const { error: updateError } = await supabase
        .from("sms_checkin_states")
        .update({
          did_workout: yesNo,
          stage: "asked_calories" as SmsCheckinStage,
        })
        .eq("id", state.id);

      if (updateError) {
        console.error("Error updating sms_checkin_states (workout):", updateError);
        return twimlMessage(
          "Something went wrong while saving that. Can you try again in a minute?"
        );
      }

      const followup = yesNo
        ? `Nice job getting your workout in today, ${profile.first_name}! 🙌 Did you stay close to your calorie target? Reply YES or NO.`
        : `It's okay if today didn't go as planned, ${profile.first_name} 💛 Did you at least stay close to your calorie target? Reply YES or NO.`;

      return twimlMessage(followup);
    }

    if (state.stage === "asked_calories") {
      // Save hit_calorie_goal, complete state, and write daily_checkins row
      const { error: updateError } = await supabase
        .from("sms_checkin_states")
        .update({
          hit_calorie_goal: yesNo,
          stage: "completed" as SmsCheckinStage,
        })
        .eq("id", state.id);

      if (updateError) {
        console.error("Error updating sms_checkin_states (calories):", updateError);
        return twimlMessage(
          "Something went wrong while saving that. Can you try again in a minute?"
        );
      }

      const didWorkout = state.did_workout ?? false;
      const hitCalories = yesNo;

      // Upsert today's daily_checkins row with no notes
      const { error: checkinError } = await supabase
        .from("daily_checkins")
        .upsert(
          {
            profile_id: profile.id,
            checkin_date: todayIso,
            did_workout: didWorkout,
            hit_calorie_goal: hitCalories,
            workout_rating: null,
            weight_kg: null,
            notes: null,
          },
          {
            onConflict: "profile_id,checkin_date",
          }
        );

      if (checkinError) {
        console.error("Error upserting daily_checkins:", checkinError);
        // We still reply so the user isn't stuck.
      }

      // Wrap-up message based on combo
      let wrapUp: string;

      if (didWorkout && hitCalories) {
        wrapUp = `That’s a dialed-in day, ${profile.first_name} 🔥 You got your workout in AND stayed on calories. Keep stacking days like this.`;
      } else if (didWorkout && !hitCalories) {
        wrapUp = `Great job showing up for your workout today 💪 Food was a bit loose, but we can tighten that up tomorrow. Progress > perfection.`;
      } else if (!didWorkout && hitCalories) {
        wrapUp = `Nice work staying on top of your calories today 🍽️ The workout can be made up – what matters is you’re still in the game.`;
      } else {
        wrapUp = `Today wasn’t perfect, but you’re still in this 💛 Let’s treat it like a data point, not a verdict. We reset tomorrow.`;
      }

      return twimlMessage(wrapUp);
    }

    // Fallback (shouldn’t really hit this)
    return twimlMessage(
      "Something about this check-in looks off. Try again later or log today inside the app."
    );
  } catch (err) {
    console.error("Twilio inbound error:", err);
    return twimlMessage(
      "I hit an error reading that message. Please try again in a bit."
    );
  }
}
