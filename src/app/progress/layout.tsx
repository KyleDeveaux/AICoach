"use client";

import { SubscriptionProvider } from "../lib/useSubscription";

export default function ProgressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
