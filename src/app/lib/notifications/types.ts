export type NotificationChannel = "sms" | "push" | "email";

export interface NotificationMessage {
  body: string;
  // Channel-specific extras. Implementers ignore fields they don't support.
  smsOptions?: { mediaUrl?: string };
  pushOptions?: { title: string; deepLink?: string };
  emailOptions?: { subject: string; html?: string };
}

export interface NotifierResult {
  success: boolean;
  channel: NotificationChannel;
  providerMessageId?: string;
  error?: string;
  skipped?: boolean; // e.g. user not opted in; not a failure
}

export interface Notifier {
  readonly channel: NotificationChannel;
  send(profileId: string, message: NotificationMessage): Promise<NotifierResult>;
}
