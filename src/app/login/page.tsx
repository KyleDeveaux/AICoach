"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        router.push("/onboarding");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Animated background gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute top-1/2 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-80 w-80 rounded-full bg-cyan-600/20 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
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
              <p className="text-[10px] font-medium text-slate-500">AI Personal Training</p>
            </div>
          </Link>

          <Link
            href="/"
            className="group hidden items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white md:flex"
          >
            <svg className="h-4 w-4 transition group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to home
          </Link>
        </div>
      </header>

      {/* Auth layout */}
      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-81px)] max-w-7xl flex-col px-6 py-12 md:flex-row md:items-center md:py-16">
        {/* Left: copy / reassurance */}
        <div className="hidden flex-1 flex-col justify-center pr-12 md:flex lg:pr-16">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
            </span>
            <span className="text-xs font-semibold text-purple-300">Start Your Journey</span>
          </div>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-white lg:text-5xl">
            Transform with{" "}
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              AI-powered
            </span>{" "}
            coaching
          </h1>

          <p className="mt-4 text-lg leading-relaxed text-slate-400">
            Join thousands achieving their fitness goals with personalized macro plans,
            smart workout selection, and AI photo analysis that tracks your real progress.
          </p>

          <div className="mt-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/10">
                <span className="text-lg">📸</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">AI Vision Analysis</h3>
                <p className="text-sm text-slate-500">Track body composition beyond the scale</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/10">
                <span className="text-lg">🎯</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Custom Macro Plans</h3>
                <p className="text-sm text-slate-500">Personalized nutrition that adapts with you</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-cyan-600/10">
                <span className="text-lg">💪</span>
              </div>
              <div>
                <h3 className="font-semibold text-white">Smart Workouts</h3>
                <p className="text-sm text-slate-500">Training tailored to your goals & equipment</p>
              </div>
            </div>
          </div>

          <p className="mt-8 text-xs text-slate-600">
            Motivo is a coaching tool and does not provide medical advice.
            Always consult healthcare professionals for medical concerns.
          </p>
        </div>

        {/* Right: auth card */}
        <div className="flex-1 md:max-w-md lg:max-w-lg">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-xl">
            {/* Subtle gradient overlay */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-cyan-500/5" />

            <div className="relative z-10">
              {/* Mode toggle */}
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">
                  {mode === "signup" ? "Create Account" : "Welcome Back"}
                </h2>
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-slate-800/50 p-1 backdrop-blur">
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${
                      mode === "signup"
                        ? "bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Sign up
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full transition ${
                      mode === "login"
                        ? "bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white shadow-lg"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Log in
                  </button>
                </div>
              </div>

              <p className="mb-6 text-sm text-slate-400">
                {mode === "signup"
                  ? "Create your account to start your transformation journey with AI-powered coaching."
                  : "Log in to continue your fitness journey and track your progress."}
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-sm font-semibold text-slate-300"
                  >
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-sm font-semibold text-slate-300"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete={
                      mode === "signup" ? "new-password" : "current-password"
                    }
                  />
                </div>

                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                    <p className="text-sm text-red-400">
                      {error === "Invalid login credentials"
                        ? "Incorrect email or password. Please try again."
                        : error}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="relative z-10">
                    {loading
                      ? mode === "signup"
                        ? "Creating your account..."
                        : "Logging you in..."
                      : mode === "signup"
                      ? "Start Your Transformation"
                      : "Continue to Dashboard"}
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-0 transition group-hover:opacity-100" />
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-xs text-slate-500">
                  {mode === "signup" ? (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("login")}
                        className="font-semibold text-purple-400 transition hover:text-purple-300"
                      >
                        Log in here
                      </button>
                    </>
                  ) : (
                    <>
                      New to Motivo?{" "}
                      <button
                        type="button"
                        onClick={() => setMode("signup")}
                        className="font-semibold text-purple-400 transition hover:text-purple-300"
                      >
                        Create an account
                      </button>
                    </>
                  )}
                </p>
              </div>

              <div className="mt-6 rounded-xl border border-white/5 bg-slate-800/30 p-4">
                <p className="text-center text-xs leading-relaxed text-slate-500">
                  By continuing, you agree that Motivo is a coaching tool and does
                  not replace professional medical advice or healthcare services.
                </p>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Secure & encrypted
            </div>
            <div className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
              No spam, ever
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
