"use client";

import { SubscriptionProvider } from "../lib/useSubscription";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
