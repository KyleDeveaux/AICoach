"use client";

import { SubscriptionProvider } from "../lib/useSubscription";

export default function FoodLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
