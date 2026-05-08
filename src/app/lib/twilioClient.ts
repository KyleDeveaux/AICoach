import "server-only";

import twilio from "twilio";
import type { Twilio } from "twilio";

let _client: Twilio | null = null;
let _fromConfig: { messagingServiceSid?: string; fromNumber?: string } | null =
  null;

export function getTwilioClient(): Twilio {
  if (_client) return _client;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "Twilio credentials missing. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
    );
  }

  _client = twilio(accountSid, authToken);
  return _client;
}

export function getTwilioFromConfig() {
  if (_fromConfig) return _fromConfig;

  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  const fromNumber =
    process.env.TWILIO_FROM_NUMBER ?? process.env.TWILIO_PHONE_NUMBER;

  if (!messagingServiceSid && !fromNumber) {
    throw new Error(
      "No Messaging Service SID or FROM number configured. Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER/TWILIO_PHONE_NUMBER."
    );
  }

  _fromConfig = {
    messagingServiceSid: messagingServiceSid || undefined,
    fromNumber: fromNumber || undefined,
  };
  return _fromConfig;
}
