import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top nav */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
              <span className="text-sm font-bold">AI</span>
            </div>
            <div className="leading-tight">
              <p className="text-base font-semibold tracking-tight">
                Coach<span className="text-blue-500">IE</span>
              </p>
              <p className="text-[11px] text-slate-400">
                AI fitness & nutrition coach
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            <a href="#features" className="hover:text-white">
              Features
            </a>
            <a href="#who-its-for" className="hover:text-white">
              Who it&apos;s for
            </a>
            <Link
              href="/login"
              className="rounded-full border border-slate-600 px-3 py-1 text-xs font-medium text-slate-200 hover:border-blue-500 hover:text-white"
            >
              Log in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative border-b border-slate-800 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
        <div className="pointer-events-none absolute inset-0 opacity-60 [background:radial-gradient(circle_at_top,_#1d4ed8_0,_transparent_50%),_radial-gradient(circle_at_bottom,_#0f172a_0,_transparent_55%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 md:flex-row md:items-center md:py-20">
          {/* Left: copy */}
          <div className="max-w-xl space-y-6">
            <p className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-blue-200">
              New • AI-powered personal trainer
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
              A personal trainer that{" "}
              <span className="text-blue-400">actually checks on you</span>.
            </h1>

            <p className="text-sm leading-relaxed text-slate-300 md:text-base">
              CoachIE calls and messages you like a real coach – asking how your
              week went, adjusting your calories, and checking if you really hit
              that workout. Weekly calls, daily accountability, and plans built
              around your actual life, not some perfect schedule.
            </p>

            <div className="flex flex-col gap-3 pt-2 text-sm sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/30 transition hover:bg-blue-500"
              >
                Get started – it&apos;s free to try
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-slate-600 px-6 py-2.5 text-sm font-semibold text-slate-200 hover:border-blue-400 hover:text-white"
              >
                See how it works
              </a>
            </div>

            <div className="flex flex-wrap gap-4 pt-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                <span>Weekly AI check-in calls</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                <span>Calories & workouts adjusted automatically</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                <span>Designed for real, busy people</span>
              </div>
            </div>
          </div>

          {/* Right: dashboard-style preview */}
          <div className="relative flex-1">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-blue-900/50 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-200">
                  Today&apos;s snapshot
                </p>
                <p className="text-[11px] text-slate-400">
                  CoachIE • Always on your side
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {/* Calories card */}
                <div className="rounded-xl bg-gradient-to-br from-blue-600 to-blue-500 p-3 text-xs text-blue-50">
                  <p className="text-[11px] font-semibold uppercase tracking-wide">
                    Calories today
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold">2,100</p>
                      <p className="text-[11px] text-blue-100">
                        Target for today
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">1,420 logged</p>
                      <p className="text-[11px] text-blue-100">
                        680 remaining
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-blue-900/60">
                    <div className="h-full w-2/3 rounded-full bg-white/90" />
                  </div>
                </div>

                {/* Check-in card */}
                <div className="rounded-xl border border-slate-700 bg-slate-900 p-3 text-xs">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                    This week
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Workouts done</span>
                      <span className="font-semibold text-slate-100">
                        2 / 4
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Days on calories</span>
                      <span className="font-semibold text-slate-100">
                        3 / 5
                      </span>
                    </div>
                    <div className="rounded-lg bg-slate-800/70 p-2 text-[11px] text-slate-200">
                      “You started this to feel confident at the beach. Today
                      counts. Let&apos;s hit that workout.”
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-[11px] text-slate-200">
                <p className="mb-1 font-semibold text-slate-100">
                  Next call scheduled
                </p>
                <p>Sunday • 5:00 PM</p>
                <p className="mt-1 text-slate-400">
                  CoachIE will review your week, adjust calories, and plan next
                  week’s workouts with you.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="border-b border-slate-800 bg-slate-900"
      >
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <h2 className="text-center text-2xl font-semibold text-white md:text-3xl">
            How Coach<span className="text-blue-400">IE</span> works
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400 md:text-base">
            Simple, structured, and built around your real life.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                1. Onboarding call
              </p>
              <h3 className="mt-2 text-sm font-semibold text-white">
                Share your story & schedule
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                CoachIE asks about your goals, why this matters to you, your
                routine, and what usually knocks you off track. This becomes
                your personal coaching profile.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                2. Smart plans
              </p>
              <h3 className="mt-2 text-sm font-semibold text-white">
                Workouts & calories, done for you
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                You get a weekly workout split, realistic calorie target, and
                simple meal ideas that fit your time, equipment, and preferences
                — no macro math required.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                3. Weekly coaching
              </p>
              <h3 className="mt-2 text-sm font-semibold text-white">
                Calls & daily check-ins
              </h3>
              <p className="mt-2 text-xs text-slate-400">
                Each week, CoachIE reviews your workouts, calories, and weight
                trend. If progress stalls, it nudges calories down or adjusts
                training — like a real coach would.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <h2 className="text-center text-2xl font-semibold text-white md:text-3xl">
            Built for accountability, not perfection
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400 md:text-base">
            You don&apos;t need another app. You need someone checking in.
          </p>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="space-y-4 text-sm text-slate-300">
              <div className="flex gap-3">
                <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-blue-600/80 text-center text-xs font-bold leading-6 text-white">
                  1
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Weekly “coach-style” calls
                  </h3>
                  <p className="text-xs text-slate-400">
                    A human-like AI call that reviews your week, talks through
                    struggles, and adjusts your plan — not just a silent
                    dashboard.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-blue-600/80 text-center text-xs font-bold leading-6 text-white">
                  2
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Daily check-ins in under 30 seconds
                  </h3>
                  <p className="text-xs text-slate-400">
                    “Did you work out?” “Did you hit your calories?” Simple
                    yes/no + 1–10 effort. No guilt, just honest tracking.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="mt-1 h-6 w-6 flex-shrink-0 rounded-full bg-blue-600/80 text-center text-xs font-bold leading-6 text-white">
                  3
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Calorie adjustments that make sense
                  </h3>
                  <p className="text-xs text-slate-400">
                    If you&apos;re consistent but weight stalls, calories nudge
                    down. If you&apos;re struggling to adhere, the focus stays
                    on habits — not starving you.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-xs text-slate-200">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-blue-400">
                Example weekly feedback
              </p>
              <p>
                “You hit 3 out of 4 workouts and stayed near your calories on 5
                days. That&apos;s solid. Your weight held steady this week, so
                we&apos;ll drop your daily target by 100 calories and keep the
                same split. You said eating out throws you off — this week,
                let&apos;s plan around 1–2 meals out instead of reacting in the
                moment.”
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for + CTA */}
      <section
        id="who-its-for"
        className="border-b border-slate-800 bg-slate-900"
      >
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
          <div className="grid gap-8 md:grid-cols-[1.3fr_minmax(0,1fr)] md:items-center">
            <div>
              <h2 className="text-2xl font-semibold text-white md:text-3xl">
                For people who are tired of starting over.
              </h2>
              <p className="mt-2 text-sm text-slate-400 md:text-base">
                CoachIE is perfect if you:
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                <li>• Have tried tracking apps, but fall off after a few weeks.</li>
                <li>• Want someone (or something) to actually hold you accountable.</li>
                <li>• Have a busy schedule and need realistic, simple plans.</li>
                <li>• Care more about consistency than extreme “shred” promises.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-400">
                Ready to start?
              </p>
              <p className="mt-2 text-sm text-slate-200">
                Create your profile, book your first AI call, and get your
                starting calories & workout plan in minutes.
              </p>
              <div className="mt-4 flex flex-col gap-2 text-sm">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/30 transition hover:bg-blue-500"
                >
                  Get started
                </Link>
                <p className="text-[11px] text-slate-400">
                  No medical advice. Always consult a doctor or healthcare
                  professional for medical concerns.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 py-6 text-center text-[11px] text-slate-500">
        <p>
          © {new Date().getFullYear()} CoachIE. All rights reserved. • This is
          a coaching tool, not a medical service.
        </p>
      </footer>
    </main>
  );
}
