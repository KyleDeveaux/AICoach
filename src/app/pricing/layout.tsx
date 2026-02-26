"use client";

import { SubscriptionProvider } from "../lib/useSubscription";

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
