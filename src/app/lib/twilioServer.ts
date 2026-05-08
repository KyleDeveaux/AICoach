import "server-only";

// lib/twilioServer.ts
import twilio from "twilio";
import type { Twilio } from "twilio";

let _client: Twilio | null = null;
let _accountSid: string | null = null;
let _authToken: string | null = null;
let _messagingServiceSid: string | null = null;
let _fromPhone: string | null = null;

function ensureInit() {
  if (_client) return;

  _accountSid = process.env.TWILIO_ACCOUNT_SID ?? null;
  _authToken = process.env.TWILIO_AUTH_TOKEN ?? null;

  if (!_accountSid || !_authToken) {
    throw new Error(
      "Twilio credentials missing. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN."
    );
  }

  _messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID || null;
  _fromPhone = process.env.TWILIO_FROM_PHONE || null;

  _client = twilio(_accountSid, _authToken);
}

function getClient(): Twilio {
  ensureInit();
  return _client!;
}

export type SendSmsResult = {
  sid: string;
  status?: string;
};

export async function sendSms(toE164: string, body: string): Promise<SendSmsResult> {
  if (!toE164 || !toE164.startsWith("+")) {
    throw new Error("sendSms requires E.164 phone number starting with +");
  }

  ensureInit();

  let from: { messagingServiceSid: string } | { from: string };
  if (_messagingServiceSid) {
    from = { messagingServiceSid: _messagingServiceSid };
  } else if (_fromPhone) {
    from = { from: _fromPhone };
  } else {
    throw new Error("Missing TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_PHONE");
  }

  const msg = await getClient().messages.create({ to: toE164, body, ...from });
  return { sid: msg.sid, status: msg.status };
}

export function verifyTwilioSignature(args: {
  req: Request;
  params: Record<string, string>;
}): boolean {
  const signature = args.req.headers.get("x-twilio-signature");
  if (!signature) return false;

  const urlObj = new URL(args.req.url);
  const computedUrl =
    process.env.APP_BASE_URL
      ? process.env.APP_BASE_URL.replace(/\/$/, "") + urlObj.pathname
      : args.req.url;

  // TWILIO_WEBHOOK_AUTH_TOKEN should be a dedicated Messaging Service signing key
  // provisioned in the Twilio Console (Messaging → Services → Webhook Signing).
  // The fallback to TWILIO_AUTH_TOKEN is for local development only — using the
  // account auth token in production means a single leak compromises both API
  // access and webhook verification simultaneously.
  const token = process.env.TWILIO_WEBHOOK_AUTH_TOKEN || process.env.TWILIO_AUTH_TOKEN;
  if (!token) return false;

  return twilio.validateRequest(token, signature, computedUrl, args.params);
}

export function getTwilioFromNumber(): string {
  ensureInit();
  if (_messagingServiceSid) return "MESSAGING_SERVICE";
  return _fromPhone || "UNKNOWN";
}
