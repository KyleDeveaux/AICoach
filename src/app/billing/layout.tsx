"use client";

import { SubscriptionProvider } from "../lib/useSubscription";

export default function BillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
