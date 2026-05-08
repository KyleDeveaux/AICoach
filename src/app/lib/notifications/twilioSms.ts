import "server-only";

import { supabaseAdmin } from "@/app/lib/supabaseAdmin";
import { sendSms } from "@/app/lib/twilioServer";
import type { Notifier, NotificationMessage, NotifierResult } from "./types";

export class TwilioSMSNotifier implements Notifier {
  readonly channel = "sms" as const;

  async send(
    profileId: string,
    message: NotificationMessage
  ): Promise<NotifierResult> {
    // Look up profile for phone number and opt-in status
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("client_profiles")
      .select("sms_phone_number, sms_checkins_enabled, allow_sms_checkins")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) {
      return {
        success: false,
        channel: "sms",
        error: `Profile lookup failed: ${profileError?.message ?? "not found"}`,
      };
    }

    // Check opt-in status
    const optedIn = !!(
      profile.sms_checkins_enabled ?? profile.allow_sms_checkins
    );
    if (!optedIn) {
      return {
        success: true,
        channel: "sms",
        skipped: true,
        error: "User not opted into SMS",
      };
    }

    // Check phone number
    const phone = profile.sms_phone_number as string | null;
    if (!phone) {
      return {
        success: false,
        channel: "sms",
        error: "No phone number on profile",
      };
    }

    // Send via Twilio
    try {
      const result = await sendSms(phone, message.body);
      return {
        success: true,
        channel: "sms",
        providerMessageId: result.sid,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        channel: "sms",
        error: msg,
      };
    }
  }
}
