// Server-only Stripe client configuration
// DO NOT import this file in client components - use pricingData.ts instead

import "server-only";
import Stripe from "stripe";
import type { SubscriptionTier, BillingInterval } from "./types";

// ──────────────────────────
// Stripe Client (server-only)
// ──────────────────────────

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

// ──────────────────────────
// Price IDs (from Stripe Dashboard)
// ──────────────────────────

export const PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY!,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL!,
  },
  elite: {
    monthly: process.env.STRIPE_PRICE_ELITE_MONTHLY!,
    annual: process.env.STRIPE_PRICE_ELITE_ANNUAL!,
  },
} as const;

// ──────────────────────────
// Helper Functions (server-only)
// ──────────────────────────

/**
 * Get price ID for a tier and interval
 */
export function getPriceId(
  tier: Exclude<SubscriptionTier, "free">,
  interval: BillingInterval
): string {
  return PRICE_IDS[tier][interval === "month" ? "monthly" : "annual"];
}

/**
 * Get tier from Stripe price ID
 */
export function getTierFromPriceId(priceId: string): SubscriptionTier {
  if (
    priceId === PRICE_IDS.pro.monthly ||
    priceId === PRICE_IDS.pro.annual
  ) {
    return "pro";
  }
  if (
    priceId === PRICE_IDS.elite.monthly ||
    priceId === PRICE_IDS.elite.annual
  ) {
    return "elite";
  }
  return "free";
}

/**
 * Get billing interval from Stripe price ID
 */
export function getIntervalFromPriceId(priceId: string): BillingInterval {
  if (
    priceId === PRICE_IDS.pro.annual ||
    priceId === PRICE_IDS.elite.annual
  ) {
    return "year";
  }
  return "month";
}

// ──────────────────────────
// Webhook Event Types
// ──────────────────────────

export const STRIPE_WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
] as const;

export type StripeWebhookEvent = (typeof STRIPE_WEBHOOK_EVENTS)[number];
