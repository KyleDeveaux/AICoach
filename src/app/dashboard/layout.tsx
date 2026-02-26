"use client";

import { SubscriptionProvider } from "../lib/useSubscription";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
