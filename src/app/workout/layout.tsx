"use client";

import { SubscriptionProvider } from "../lib/useSubscription";

export default function WorkoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
