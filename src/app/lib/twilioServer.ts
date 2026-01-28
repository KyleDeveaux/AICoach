// lib/twilioServer.ts
import twilio from "twilio";

function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name} in environment`);
  return v;
}

export const TWILIO_ACCOUNT_SID = requiredEnv("TWILIO_ACCOUNT_SID");
export const TWILIO_AUTH_TOKEN = requiredEnv("TWILIO_AUTH_TOKEN");

// Prefer Messaging Service SID if you add it later, otherwise use FROM phone.
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID || null;
const TWILIO_FROM_PHONE = process.env.TWILIO_FROM_PHONE || null;

export const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

export type SendSmsResult = {
  sid: string;
  status?: string;
};

export async function sendSms(toE164: string, body: string): Promise<SendSmsResult> {
  if (!toE164 || !toE164.startsWith("+")) {
    throw new Error("sendSms requires E.164 phone number starting with +");
  }

  const payload: any = {
    to: toE164,
    body,
  };

  if (TWILIO_MESSAGING_SERVICE_SID) {
    payload.messagingServiceSid = TWILIO_MESSAGING_SERVICE_SID;
  } else if (TWILIO_FROM_PHONE) {
    payload.from = TWILIO_FROM_PHONE;
  } else {
    throw new Error("Missing TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_PHONE");
  }

  const msg = await twilioClient.messages.create(payload);
  return { sid: msg.sid, status: msg.status };
}

export function verifyTwilioSignature(args: {
  req: Request;
  params: Record<string, string>;
}): boolean {
  const signature = args.req.headers.get("x-twilio-signature");
  if (!signature) return false;

  // IMPORTANT:
  // Twilio signs the full URL *as configured in the Twilio Console*.
  // In many Vercel setups, req.url is correct. If you see signature failures,
  // set APP_BASE_URL and we’ll use it to build the correct URL.
  const urlObj = new URL(args.req.url);
  const computedUrl =
    process.env.APP_BASE_URL
      ? process.env.APP_BASE_URL.replace(/\/$/, "") + urlObj.pathname
      : args.req.url;

  const token = process.env.TWILIO_WEBHOOK_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;

  return twilio.validateRequest(token, signature, computedUrl, args.params);
}

export function getTwilioFromNumber(): string {
  if (TWILIO_MESSAGING_SERVICE_SID) return "MESSAGING_SERVICE";
  return TWILIO_FROM_PHONE || "UNKNOWN";
}
