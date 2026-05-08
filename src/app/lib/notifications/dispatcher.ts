import "server-only";

import type { Notifier, NotificationMessage, NotifierResult } from "./types";
import { TwilioSMSNotifier } from "./twilioSms";

const notifiers: Notifier[] = [
  new TwilioSMSNotifier(),
  // TODO(mobile): new ExpoPushNotifier() — push first, SMS as fallback
  // TODO(email): new ResendEmailNotifier() — for transactional and digest
];

/**
 * Send a notification to a user. Tries channels in order; returns the result
 * of the first one that doesn't skip. When push and email are added, this
 * becomes the place where channel preference logic lives.
 */
export async function notify(
  profileId: string,
  message: NotificationMessage
): Promise<NotifierResult> {
  for (const notifier of notifiers) {
    const result = await notifier.send(profileId, message);
    if (!result.skipped) return result;
  }
  return {
    success: false,
    channel: "sms",
    skipped: true,
    error: "No channel available",
  };
}
