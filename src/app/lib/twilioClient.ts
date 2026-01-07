import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Support either name: TWILIO_FROM_NUMBER or TWILIO_PHONE_NUMBER
const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
const fromNumber =
  process.env.TWILIO_FROM_NUMBER ?? process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken) {
  throw new Error(
    "Twilio credentials missing. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
  );
}

if (!messagingServiceSid && !fromNumber) {
  throw new Error(
    "No Messaging Service SID or FROM number configured. Set TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER/TWILIO_PHONE_NUMBER."
  );
}

export const twilioClient = twilio(accountSid, authToken);

export function getTwilioFromConfig() {
  return {
    messagingServiceSid: messagingServiceSid || undefined,
    fromNumber: fromNumber || undefined,
  };
}
