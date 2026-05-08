"use client";

// React hook for subscription state management with Context

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  ReactNode,
} from "react";
import type {
  SubscriptionTier,
  SubscriptionWithUsage,
  TierLimits,
} from "./types";
import { TIER_LIMITS } from "./featureGating";

// ──────────────────────────
// Hook Return Type
// ──────────────────────────

interface UseSubscriptionResult {
  // Data
  subscription: SubscriptionWithUsage | null;
  tier: SubscriptionTier;
  limits: TierLimits;

  // State
  loading: boolean;
  error: string | null;

  // Trial info
  isTrialing: boolean;
  trialDaysRemaining: number;

  // Usage
  getUsage: (feature: string) => { used: number; limit: number; remaining: number };

  // Feature checks
  canUse: (feature: string) => boolean;
  hasUnlimited: (feature: string) => boolean;

  // Actions
  refresh: () => Promise<void>;
  startCheckout: (tier: Exclude<SubscriptionTier, "free">, interval: "month" | "year") => Promise<void>;
  openPortal: () => Promise<void>;
}

// ──────────────────────────
// Context
// ──────────────────────────

const SubscriptionContext = createContext<UseSubscriptionResult | null>(null);

// ──────────────────────────
// Provider Component
// ──────────────────────────

interface SubscriptionProviderProps {
  children: ReactNode;
}

export function SubscriptionProvider({ children }: SubscriptionProviderProps) {
  const [subscription, setSubscription] = useState<SubscriptionWithUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch subscription data
  const fetchSubscription = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/subscription", {
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 401) {
          // Not logged in - return free tier defaults
          setSubscription(null);
          return;
        }
        throw new Error("Failed to fetch subscription");
      }

      const data = await res.json();
      setSubscription(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("[useSubscription] Error:", message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Get current tier (defaults to free)
  const tier: SubscriptionTier = subscription?.tier || "free";
  const limits: TierLimits = subscription?.limits || TIER_LIMITS.free;

  // Get usage for a feature
  const getUsage = useCallback(
    (feature: string): { used: number; limit: number; remaining: number } => {
      const usage = subscription?.usage;
      const limitKey = `${feature}_per_month` as keyof TierLimits;
      const usageKey = `${feature}_used` as keyof typeof usage;

      const limit = (limits[limitKey] as number) ?? 0;
      const used = (usage?.[usageKey] as unknown as number) ?? 0;

      // Unlimited
      if (limit === -1) {
        return { used, limit: -1, remaining: -1 };
      }

      return {
        used,
        limit,
        remaining: Math.max(0, limit - used),
      };
    },
    [subscription, limits]
  );

  // Check if user can use a feature
  const canUse = useCallback(
    (feature: string): boolean => {
      // Boolean features
      if (feature in limits && typeof limits[feature as keyof TierLimits] === "boolean") {
        return limits[feature as keyof TierLimits] === true;
      }

      // Metered features
      const usage = getUsage(feature);
      return usage.limit === -1 || usage.remaining > 0;
    },
    [limits, getUsage]
  );

  // Check if feature is unlimited
  const hasUnlimited = useCallback(
    (feature: string): boolean => {
      const limitKey = `${feature}_per_month` as keyof TierLimits;
      return (limits[limitKey] as number) === -1;
    },
    [limits]
  );

  // Start checkout flow
  const startCheckout = useCallback(
    async (checkoutTier: Exclude<SubscriptionTier, "free">, interval: "month" | "year") => {
      try {
        const res = await fetch("/api/stripe/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ tier: checkoutTier, interval }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to create checkout session");
        }

        const { url } = await res.json();
        if (url) {
          window.location.href = url;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("[useSubscription] Checkout error:", message);
        throw err;
      }
    },
    []
  );

  // Open customer portal
  const openPortal = useCallback(async () => {
    try {
      const res = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create portal session");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error("[useSubscription] Portal error:", message);
      throw err;
    }
  }, []);

  const value: UseSubscriptionResult = {
    subscription,
    tier,
    limits,
    loading,
    error,
    isTrialing: subscription?.isTrialing || false,
    trialDaysRemaining: subscription?.trialDaysRemaining || 0,
    getUsage,
    canUse,
    hasUnlimited,
    refresh: fetchSubscription,
    startCheckout,
    openPortal,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

// ──────────────────────────
// Hook Implementation
// ──────────────────────────

export function useSubscription(): UseSubscriptionResult {
  const context = useContext(SubscriptionContext);

  // If used outside provider, return default free tier values
  // This maintains backward compatibility for pages not wrapped in provider
  if (!context) {
    return {
      subscription: null,
      tier: "free",
      limits: TIER_LIMITS.free,
      loading: false,
      error: null,
      isTrialing: false,
      trialDaysRemaining: 0,
      getUsage: () => ({ used: 0, limit: 0, remaining: 0 }),
      canUse: () => false,
      hasUnlimited: () => false,
      refresh: async () => {},
      startCheckout: async () => {},
      openPortal: async () => {},
    };
  }

  return context;
}

// ──────────────────────────
// Utility Exports
// ──────────────────────────

export { TIER_LIMITS } from "./featureGating";
