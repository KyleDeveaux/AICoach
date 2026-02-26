// Client-safe pricing data - can be imported anywhere

import type { SubscriptionTier, PricingTier } from "./types";

// ──────────────────────────
// Pricing Configuration
// ──────────────────────────

export const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    name: "Free",
    description: "Get started with basic fitness tracking",
    monthlyPrice: 0,
    annualPrice: 0,
    features: [
      "Set custom macros & calorie targets",
      "Full dashboard hub access",
      "Workout tab with manual logging",
      "Progress tracking & charts",
      "Food logging & nutrition tracking",
      "Manual workout builder",
    ],
    stripePriceIds: {
      monthly: "",
      annual: "",
    },
  },
  {
    id: "pro",
    name: "Pro",
    description: "AI-powered coaching for serious results",
    monthlyPrice: 14.99,
    annualPrice: 129.99,
    highlighted: true,
    features: [
      "Everything in Free",
      "AI Coaching dashboard cards",
      "SMS daily check-ins",
      "AI body check analysis (2/month)",
      "Weekly AI coaching summaries",
      "AI workout feedback & suggestions",
      "AI-generated workout plans",
      "Ad-free experience",
    ],
    stripePriceIds: {
      monthly: "",
      annual: "",
    },
  },
  {
    id: "elite",
    name: "Elite",
    description: "Premium AI coaching with voice calls",
    monthlyPrice: 24.99,
    annualPrice: 199.99,
    features: [
      "Everything in Pro",
      "AI Coach calls (2/month)",
      "Unlimited body check analyses",
      "Unlimited AI plan regeneration",
      "Advanced analytics & insights",
      "Data export (CSV/PDF)",
      "Early access to new features",
    ],
    stripePriceIds: {
      monthly: "",
      annual: "",
    },
  },
];

// ──────────────────────────
// Helper Functions (client-safe)
// ──────────────────────────

/**
 * Get pricing tier configuration by ID
 */
export function getPricingTier(tier: SubscriptionTier): PricingTier | undefined {
  return PRICING_TIERS.find((t) => t.id === tier);
}

/**
 * Calculate annual savings
 */
export function getAnnualSavings(tier: Exclude<SubscriptionTier, "free">): {
  amount: number;
  percentage: number;
} {
  const pricingTier = getPricingTier(tier);
  if (!pricingTier) return { amount: 0, percentage: 0 };

  const monthlyTotal = pricingTier.monthlyPrice * 12;
  const annualTotal = pricingTier.annualPrice;
  const amount = monthlyTotal - annualTotal;
  const percentage = Math.round((amount / monthlyTotal) * 100);

  return { amount, percentage };
}
