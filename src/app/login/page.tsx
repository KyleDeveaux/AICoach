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
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
              <span className="text-sm font-bold">AI</span>
            </div>
            <div className="leading-tight">
              <p className="text-base font-semibold tracking-tight text-slate-900">
                Coach<span className="text-blue-600">IE</span>
              </p>
              <p className="text-[11px] text-slate-500">
                AI fitness &amp; nutrition coach
              </p>
            </div>
          </Link>

          <Link
            href="/"
            className="hidden text-xs font-medium text-slate-500 hover:text-slate-900 md:inline"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      {/* Auth layout */}
      <section className="mx-auto flex min-h-[calc(100vh-64px)] max-w-6xl flex-col px-4 py-8 md:flex-row md:items-center md:py-12">
        {/* Left: copy / reassurance (light version) */}
        <div className="hidden flex-1 flex-col justify-center pr-8 md:flex">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-blue-600">
            Start your coaching journey
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Log in or create your{" "}
            <span className="text-blue-600">CoachIE</span> account.
          </h1>
          <p className="mt-3 text-sm text-slate-600 md:text-base">
            One account gives you weekly AI coaching calls, daily check-ins, and
            a plan built around your schedule — so you&apos;re not doing this
            alone.
          </p>

          <ul className="mt-5 space-y-2 text-sm text-slate-700">
            <li>• Get a realistic calorie target based on your goal.</li>
            <li>• Follow workouts tailored to your time &amp; equipment.</li>
            <li>• Let CoachIE adjust your plan automatically each week.</li>
          </ul>

          <p className="mt-4 text-xs text-slate-500">
            CoachIE is a coaching tool only and does not provide medical advice.
          </p>
        </div>

        {/* Right: auth card */}
        <div className="flex-1">
          <div className="mx-auto mt-6 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-md shadow-slate-200">
            {/* Mode toggle */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {mode === "signup" ? "Create your account" : "Log in"}
              </h2>
              <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`px-3 py-1 rounded-full transition ${
                    mode === "signup"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className={`px-3 py-1 rounded-full transition ${
                    mode === "login"
                      ? "bg-blue-600 text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Log in
                </button>
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {mode === "signup"
                ? "Use your email and a secure password to get started. You’ll set up your profile on the next screen."
                : "Enter the email and password you used when signing up."}
            </p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4 text-sm">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
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
                  className="mb-1 block text-xs font-medium text-slate-700"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
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
                <p className="text-xs text-rose-500">
                  {error === "Invalid login credentials"
                    ? "Incorrect email or password. Please try again."
                    : error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {loading
                  ? mode === "signup"
                    ? "Creating account..."
                    : "Logging in..."
                  : mode === "signup"
                  ? "Create account"
                  : "Log in"}
              </button>
            </form>

            <p className="mt-4 text-center text-[11px] text-slate-500">
              By continuing, you agree that CoachIE is a coaching tool and does
              not replace professional medical advice.
            </p>

            <p className="mt-3 text-center text-[11px] text-slate-500">
              {mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  New here?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Create an account
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
