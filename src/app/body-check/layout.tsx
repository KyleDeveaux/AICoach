"use client";

import { SubscriptionProvider } from "../lib/useSubscription";

export default function BodyCheckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
