"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import { PRICING_TIERS } from "../lib/pricingData";
import { useSubscription } from "../lib/useSubscription";
import type { SubscriptionTier, BillingInterval, PricingTier } from "../lib/types";

export default function PricingPage() {
  const router = useRouter();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loadingTier, setLoadingTier] = useState<SubscriptionTier | null>(null);

  const { tier: currentTier, subscription, startCheckout, loading: subscriptionLoading } = useSubscription();

  // Get subscription status to determine if user can resubscribe
  const subscriptionRecord = subscription?.subscription;
  const subscriptionStatus = subscriptionRecord?.status;

  // Allow resubscription if:
  // 1. Status is canceled or past_due
  // 2. Subscription has a canceled_at date (pending cancellation)
  // 3. No subscription record exists but user has a paid tier in their profile
  const hasPendingCancellation = subscriptionRecord?.canceled_at != null;
  const hasNoSubscriptionRecord = !subscriptionRecord && currentTier !== "free";
  const canResubscribe =
    subscriptionStatus === "canceled" ||
    subscriptionStatus === "past_due" ||
    hasPendingCancellation ||
    hasNoSubscriptionRecord;

  // Check auth status
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      setIsLoggedIn(!!user);
    }
    checkAuth();
  }, []);

  // Handle tier selection
  async function handleSelectTier(tier: SubscriptionTier) {
    if (tier === "free") {
      if (isLoggedIn) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
      return;
    }

    if (!isLoggedIn) {
      // Store selection and redirect to login
      sessionStorage.setItem("pending_subscription", JSON.stringify({ tier, interval: billingInterval }));
      router.push("/login?redirect=/pricing");
      return;
    }

    try {
      setLoadingTier(tier);
      await startCheckout(tier as Exclude<SubscriptionTier, "free">, billingInterval);
    } catch (err) {
      console.error("Checkout error:", err);
    } finally {
      setLoadingTier(null);
    }
  }

  // Calculate savings
  function getAnnualSavings(tier: PricingTier): number {
    if (tier.monthlyPrice === 0) return 0;
    const monthlyTotal = tier.monthlyPrice * 12;
    return Math.round(monthlyTotal - tier.annualPrice);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Background gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-80 w-80 rounded-full bg-cyan-600/20 blur-3xl" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 opacity-75 blur-md transition group-hover:opacity-100" />
              <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 shadow-lg">
                <span className="text-lg font-black text-white">M</span>
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">
                Moti<span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">vo</span>
              </h1>
            </div>
          </Link>

          <nav className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-purple-500/40"
              >
                Get Started
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 pt-16 pb-8 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 backdrop-blur-sm mb-6">
            <span className="text-xs font-semibold text-purple-300">7-day free trial on all paid plans</span>
          </div>

          <h1 className="text-4xl font-black leading-tight tracking-tight text-white md:text-5xl lg:text-6xl mb-4">
            Choose your{" "}
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              transformation
            </span>{" "}
            plan
          </h1>

          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Start free and upgrade when you're ready for AI-powered coaching that adapts to your progress.
          </p>
        </div>
      </section>

      {/* Billing Toggle */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-7xl flex justify-center">
          <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setBillingInterval("month")}
              className={[
                "rounded-full px-6 py-2 text-sm font-semibold transition",
                billingInterval === "month"
                  ? "bg-white text-slate-900"
                  : "text-slate-400 hover:text-white",
              ].join(" ")}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={[
                "rounded-full px-6 py-2 text-sm font-semibold transition flex items-center gap-2",
                billingInterval === "year"
                  ? "bg-white text-slate-900"
                  : "text-slate-400 hover:text-white",
              ].join(" ")}
            >
              Annual
              <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-xs font-bold text-green-400">
                Save 28%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="relative px-6 pb-20">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 md:grid-cols-3">
            {PRICING_TIERS.map((tier) => {
              // Allow resubscription if user canceled or has past_due status
              const isCurrentTier = currentTier === tier.id && !canResubscribe;
              const savings = getAnnualSavings(tier);
              const price = billingInterval === "month" ? tier.monthlyPrice : tier.annualPrice;
              const isLoading = loadingTier === tier.id;

              return (
                <div
                  key={tier.id}
                  className={[
                    "relative rounded-3xl border p-8 transition-all duration-300",
                    tier.highlighted
                      ? "border-purple-500/50 bg-gradient-to-b from-purple-500/10 to-slate-900/50 shadow-2xl shadow-purple-500/20 scale-105 md:scale-110"
                      : "border-white/10 bg-white/5 hover:border-white/20",
                  ].join(" ")}
                >
                  {/* Popular badge */}
                  {tier.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <div className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-1 text-xs font-bold text-white shadow-lg">
                        Most Popular
                      </div>
                    </div>
                  )}

                  {/* Current plan badge */}
                  {isCurrentTier && !subscriptionLoading && (
                    <div className="absolute -top-4 right-4">
                      <div className="rounded-full bg-green-500 px-3 py-1 text-xs font-bold text-white">
                        Current Plan
                      </div>
                    </div>
                  )}

                  {/* Tier name */}
                  <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{tier.description}</p>

                  {/* Price */}
                  <div className="mt-6 flex items-baseline gap-2">
                    <span className="text-4xl font-black text-white">
                      ${billingInterval === "month" ? tier.monthlyPrice : (tier.annualPrice / 12).toFixed(2)}
                    </span>
                    <span className="text-slate-500">/month</span>
                  </div>

                  {billingInterval === "year" && tier.annualPrice > 0 && (
                    <p className="mt-1 text-sm text-slate-500">
                      ${tier.annualPrice}/year (save ${savings})
                    </p>
                  )}

                  {/* CTA Button */}
                  <button
                    onClick={() => handleSelectTier(tier.id)}
                    disabled={isLoading || isCurrentTier}
                    className={[
                      "mt-6 w-full rounded-xl py-3 text-sm font-bold transition",
                      tier.highlighted
                        ? "bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white hover:shadow-lg hover:shadow-purple-500/30 disabled:opacity-50"
                        : tier.id === "free"
                        ? "bg-white/10 text-white hover:bg-white/20 disabled:opacity-50"
                        : "border border-white/20 text-white hover:bg-white/10 disabled:opacity-50",
                    ].join(" ")}
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Processing...
                      </span>
                    ) : isCurrentTier ? (
                      "Current Plan"
                    ) : tier.id === "free" ? (
                      isLoggedIn ? "Go to Dashboard" : "Get Started Free"
                    ) : canResubscribe ? (
                      "Subscribe"
                    ) : (
                      "Start 7-Day Free Trial"
                    )}
                  </button>

                  {/* Features */}
                  <ul className="mt-8 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm">
                        <svg
                          className={[
                            "mt-0.5 h-5 w-5 flex-shrink-0",
                            tier.highlighted ? "text-purple-400" : "text-green-400",
                          ].join(" ")}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative border-t border-white/5 bg-slate-900/50 px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-center text-3xl font-black text-white mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <FAQItem
              question="How does the 7-day free trial work?"
              answer="When you sign up for Pro or Elite, you'll get full access to all features for 7 days. Your card will only be charged after the trial ends. Cancel anytime during the trial and you won't be charged."
            />
            <FAQItem
              question="Can I switch plans later?"
              answer="Yes! You can upgrade or downgrade at any time. When you upgrade, you'll get immediate access to the new features. When you downgrade, you'll keep your current plan until the end of your billing period."
            />
            <FAQItem
              question="What happens to my data if I cancel?"
              answer="Your workout logs, progress photos, and all data remain yours. If you downgrade to Free, you'll still have access to your data and basic features. AI-powered features will become unavailable until you resubscribe."
            />
            <FAQItem
              question="Is there a refund policy?"
              answer="We offer a full refund within the first 14 days of any paid subscription if you're not satisfied. Just reach out to our support team."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit cards (Visa, Mastercard, American Express) through our secure payment partner, Stripe. We also support Apple Pay and Google Pay."
            />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-black text-white mb-4">
            Ready to transform?
          </h2>
          <p className="text-lg text-slate-400 mb-8">
            Start your 7-day free trial today. No commitment, cancel anytime.
          </p>
          <Link
            href={isLoggedIn ? "/dashboard" : "/login"}
            className="inline-block rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-8 py-4 text-base font-bold text-white shadow-2xl shadow-purple-500/30 transition hover:shadow-purple-500/50 hover:scale-105"
          >
            {isLoggedIn ? "Go to Dashboard" : "Get Started Free"}
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-8">
        <div className="mx-auto max-w-7xl flex items-center justify-between text-sm text-slate-500">
          <p>&copy; {new Date().getFullYear()} Motivo. All rights reserved.</p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

// FAQ Item Component
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-white/10 pb-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-base font-semibold text-white">{question}</span>
        <svg
          className={[
            "h-5 w-5 text-slate-400 transition-transform",
            isOpen ? "rotate-180" : "",
          ].join(" ")}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <p className="mt-3 text-sm text-slate-400 leading-relaxed">{answer}</p>
      )}
    </div>
  );
}
