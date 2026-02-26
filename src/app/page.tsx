import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Animated background gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-80 w-80 rounded-full bg-cyan-600/20 blur-3xl" />
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
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

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-slate-400 transition hover:text-white">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-slate-400 transition hover:text-white">
              How it works
            </a>
            <Link href="/pricing" className="text-sm font-medium text-slate-400 transition hover:text-white">
              Pricing
            </Link>
            <a href="#results" className="text-sm font-medium text-slate-400 transition hover:text-white">
              Results
            </a>
            <Link
              href="/login"
              className="group relative overflow-hidden rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/25 transition hover:shadow-purple-500/40"
            >
              <span className="relative z-10">Start Training</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-0 transition group-hover:opacity-100" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-20 md:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Content */}
            <div className="flex flex-col justify-center space-y-8">
              {/* Badge */}
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-2 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-purple-500" />
                </span>
                <span className="text-xs font-semibold text-purple-300">AI-Powered Training Platform</span>
              </div>

              {/* Headline */}
              <div className="space-y-4">
                <h1 className="text-4xl font-black leading-tight tracking-tight text-white md:text-6xl lg:text-7xl">
                  Your AI coach that{" "}
                  <span className="relative">
                    <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      sees
                    </span>
                  </span>
                  ,{" "}
                  <span className="relative">
                    <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                      plans
                    </span>
                  </span>
                  {" "}& adapts
                </h1>
                <p className="text-lg leading-relaxed text-slate-400 md:text-xl">
                  Upload progress photos. Get AI-powered body analysis. Receive custom macro plans
                  and workouts tailored to your physique, goals, and lifestyle.
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col gap-4 sm:flex-row">
                <Link
                  href="/login"
                  className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-8 py-4 text-center text-base font-bold text-white shadow-2xl shadow-purple-500/30 transition hover:shadow-purple-500/50 hover:scale-105"
                >
                  <span className="relative z-10">Begin Your Transformation</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-0 transition group-hover:opacity-100" />
                </Link>
                <a
                  href="#how-it-works"
                  className="group flex items-center justify-center gap-2 rounded-2xl bg-amber-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-amber-500/25 transition hover:bg-amber-500 hover:shadow-amber-500/40"
                >
                  See How It Works
                  <svg className="h-5 w-5 group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </a>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-8 pt-4">
                <div>
                  <p className="text-3xl font-bold text-white">10K+</p>
                  <p className="text-sm text-slate-500">Active users</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">50K+</p>
                  <p className="text-sm text-slate-500">Photos analyzed</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-white">4.9/5</p>
                  <p className="text-sm text-slate-500">User rating</p>
                </div>
              </div>
            </div>

            {/* Right: Dashboard Preview */}
            <div className="relative lg:pl-8">
              {/* Floating cards effect */}
              <div className="relative">
                {/* Main card */}
                <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl">
                  <div className="mb-6 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-400">Your Dashboard</h3>
                      <p className="text-2xl font-bold text-white">Progress Overview</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 px-3 py-1">
                      <span className="text-xs font-bold text-green-400">On Track</span>
                    </div>
                  </div>

                  {/* Macro rings */}
                  <div className="mb-6 grid grid-cols-3 gap-4">
                    <div className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 p-4">
                      <div className="mb-2 text-xs font-medium text-purple-300">Protein</div>
                      <div className="text-2xl font-bold text-white">165g</div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-purple-900/30">
                        <div className="h-full w-4/5 rounded-full bg-gradient-to-r from-purple-500 to-purple-400" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 p-4">
                      <div className="mb-2 text-xs font-medium text-blue-300">Carbs</div>
                      <div className="text-2xl font-bold text-white">210g</div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-blue-900/30">
                        <div className="h-full w-3/5 rounded-full bg-gradient-to-r from-blue-500 to-blue-400" />
                      </div>
                    </div>
                    <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 p-4">
                      <div className="mb-2 text-xs font-medium text-cyan-300">Fats</div>
                      <div className="text-2xl font-bold text-white">68g</div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-cyan-900/30">
                        <div className="h-full w-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-400" />
                      </div>
                    </div>
                  </div>

                  {/* AI Insight */}
                  <div className="mb-6 rounded-2xl border border-white/5 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-blue-500">
                        <span className="text-xs">🤖</span>
                      </div>
                      <span className="text-xs font-semibold text-purple-300">AI Analysis</span>
                    </div>
                    <p className="text-sm leading-relaxed text-slate-300">
                      "Excellent progress this week! Your upper body definition is improving.
                      Continue current macros and add 5 lbs to bench press."
                    </p>
                  </div>

                  {/* Next workout */}
                  <div className="rounded-2xl border border-white/5 bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-semibold text-white">Next Workout</span>
                      <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-300">
                        AI Selected
                      </span>
                    </div>
                    <h4 className="mb-1 text-base font-bold text-white">Upper Body Power</h4>
                    <p className="text-xs text-slate-400">6 exercises • 45 min • Intermediate</p>
                  </div>
                </div>

                {/* Floating badge */}
                <div className="absolute -right-6 -top-6 rounded-2xl border border-white/10 bg-slate-900/90 p-4 shadow-xl backdrop-blur-xl">
                  <div className="text-xs font-medium text-slate-400">Body Fat</div>
                  <div className="mt-1 text-3xl font-bold text-green-400">-2.3%</div>
                  <div className="mt-1 text-xs text-slate-500">Last 30 days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative border-y border-white/5 bg-slate-900/50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          {/* Section header */}
          <div className="mb-16 text-center">
            <div className="mb-4 inline-block rounded-full border border-purple-500/20 bg-purple-500/10 px-4 py-1 text-xs font-semibold text-purple-300">
              FEATURES
            </div>
            <h2 className="mb-4 text-4xl font-black text-white md:text-5xl">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                succeed
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              Powered by cutting-edge AI technology to give you personalized coaching that adapts to your progress
            </p>
          </div>

          {/* Feature grid */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 backdrop-blur transition hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10">
                <span className="text-3xl">📸</span>
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">AI Vision Analysis</h3>
              <p className="leading-relaxed text-slate-400">
                Upload progress photos and let our AI analyze body composition, track changes, and provide visual progress insights beyond the scale.
              </p>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-0 transition group-hover:opacity-100" />
            </div>

            {/* Feature 2 */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 backdrop-blur transition hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">Custom Macro Planning</h3>
              <p className="leading-relaxed text-slate-400">
                Get personalized protein, carb, and fat targets calculated from your goals, activity level, and body composition that adjust as you progress.
              </p>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-0 transition group-hover:opacity-100" />
            </div>

            {/* Feature 3 */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 backdrop-blur transition hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10">
                <span className="text-3xl">💪</span>
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">Smart Workout Selection</h3>
              <p className="leading-relaxed text-slate-400">
                AI-curated workouts based on your equipment, experience, recovery status, and goals. No cookie-cutter programs.
              </p>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-0 transition group-hover:opacity-100" />
            </div>

            {/* Feature 4 */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 backdrop-blur transition hover:border-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-600/10">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">Progress Tracking</h3>
              <p className="leading-relaxed text-slate-400">
                Comprehensive tracking of workouts, nutrition, body metrics, and visual progress all in one intelligent dashboard.
              </p>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-0 transition group-hover:opacity-100" />
            </div>

            {/* Feature 5 */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 backdrop-blur transition hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-600/10">
                <span className="text-3xl">🔄</span>
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">Adaptive Programming</h3>
              <p className="leading-relaxed text-slate-400">
                Your plan evolves with you. Macros adjust based on progress, workouts adapt to recovery, and intensity scales with your fitness.
              </p>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-0 transition group-hover:opacity-100" />
            </div>

            {/* Feature 6 */}
            <div className="group relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-slate-900/80 to-slate-950/80 p-8 backdrop-blur transition hover:border-cyan-500/30 hover:shadow-2xl hover:shadow-cyan-500/10">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-cyan-600/10">
                <span className="text-3xl">🎙️</span>
              </div>
              <h3 className="mb-3 text-xl font-bold text-white">Weekly AI Coaching</h3>
              <p className="leading-relaxed text-slate-400">
                Human-like AI calls that review your week, discuss challenges, adjust your plan, and keep you accountable to your goals.
              </p>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 opacity-0 transition group-hover:opacity-100" />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative px-6 py-24">
        <div className="mx-auto max-w-7xl">
          {/* Section header */}
          <div className="mb-16 text-center">
            <div className="mb-4 inline-block rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-1 text-xs font-semibold text-blue-300">
              HOW IT WORKS
            </div>
            <h2 className="mb-4 text-4xl font-black text-white md:text-5xl">
              Start training in{" "}
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                3 simple steps
              </span>
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-slate-400">
              From setup to results, here's how Motivo transforms your fitness journey
            </p>
          </div>

          {/* Steps */}
          <div className="relative space-y-12">
            {/* Connecting line */}
            <div className="absolute left-8 top-12 hidden h-[calc(100%-6rem)] w-0.5 bg-gradient-to-b from-purple-500 via-blue-500 to-cyan-500 md:block" />

            {/* Step 1 */}
            <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
              <div className="relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-purple-500 shadow-lg shadow-purple-500/50">
                <span className="text-2xl font-black text-white">1</span>
              </div>
              <div className="flex-1 rounded-3xl border border-white/5 bg-slate-900/50 p-8 backdrop-blur">
                <h3 className="mb-3 text-2xl font-bold text-white">Upload Your First Photo</h3>
                <p className="mb-4 text-lg leading-relaxed text-slate-400">
                  Take progress photos from the front, side, and back. Our AI analyzes your current physique,
                  estimates body composition, and establishes your starting point for transformation tracking.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full bg-purple-500/10 px-3 py-1 text-sm text-purple-300">Body Analysis</span>
                  <span className="rounded-full bg-purple-500/10 px-3 py-1 text-sm text-purple-300">Baseline Metrics</span>
                  <span className="rounded-full bg-purple-500/10 px-3 py-1 text-sm text-purple-300">Goal Setting</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
              <div className="relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-blue-500 shadow-lg shadow-blue-500/50">
                <span className="text-2xl font-black text-white">2</span>
              </div>
              <div className="flex-1 rounded-3xl border border-white/5 bg-slate-900/50 p-8 backdrop-blur">
                <h3 className="mb-3 text-2xl font-bold text-white">Get Your Personalized Plan</h3>
                <p className="mb-4 text-lg leading-relaxed text-slate-400">
                  Receive custom macro targets, meal guidelines, and a weekly workout split designed for your
                  goals, equipment, and schedule. Everything adapts to your lifestyle and preferences.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-300">Macro Calculations</span>
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-300">Workout Programs</span>
                  <span className="rounded-full bg-blue-500/10 px-3 py-1 text-sm text-blue-300">Meal Ideas</span>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
              <div className="relative z-10 flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-cyan-500 shadow-lg shadow-cyan-500/50">
                <span className="text-2xl font-black text-white">3</span>
              </div>
              <div className="flex-1 rounded-3xl border border-white/5 bg-slate-900/50 p-8 backdrop-blur">
                <h3 className="mb-3 text-2xl font-bold text-white">Train & Adapt</h3>
                <p className="mb-4 text-lg leading-relaxed text-slate-400">
                  Execute your workouts, track your nutrition, and upload weekly photos. Motivo analyzes your
                  progress and adjusts your plan to keep you on the fastest path to your goals.
                </p>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">Weekly Check-ins</span>
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">Plan Adjustments</span>
                  <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">Accountability</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results/Testimonial Section */}
      <section id="results" className="relative border-y border-white/5 bg-slate-900/50 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <div className="mb-4 inline-block rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1 text-xs font-semibold text-cyan-300">
              RESULTS
            </div>
            <h2 className="mb-4 text-4xl font-black text-white md:text-5xl">
              Real people. Real{" "}
              <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                transformations
              </span>
            </h2>
          </div>

          {/* Stats grid */}
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-purple-500/10 to-slate-900/50 p-8 text-center backdrop-blur">
              <div className="mb-2 text-5xl font-black text-white">10K+</div>
              <div className="text-sm font-medium text-purple-300">Active Members</div>
              <div className="mt-2 text-xs text-slate-500">Growing daily</div>
            </div>
            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-blue-500/10 to-slate-900/50 p-8 text-center backdrop-blur">
              <div className="mb-2 text-5xl font-black text-white">-15%</div>
              <div className="text-sm font-medium text-blue-300">Avg. Body Fat Lost</div>
              <div className="mt-2 text-xs text-slate-500">In 12 weeks</div>
            </div>
            <div className="rounded-3xl border border-white/5 bg-gradient-to-br from-cyan-500/10 to-slate-900/50 p-8 text-center backdrop-blur">
              <div className="mb-2 text-5xl font-black text-white">4.9★</div>
              <div className="text-sm font-medium text-cyan-300">User Rating</div>
              <div className="mt-2 text-xs text-slate-500">From 2,400+ reviews</div>
            </div>
          </div>

          {/* Testimonials */}
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/5 bg-slate-900/80 p-8 backdrop-blur">
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="mb-6 text-lg leading-relaxed text-slate-300">
                "The AI photo analysis is incredible. Seeing my progress visualized beyond just weight kept me
                motivated. Lost 25 lbs and gained visible muscle definition in 3 months."
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-blue-500 text-lg font-bold text-white">
                  JD
                </div>
                <div>
                  <div className="font-semibold text-white">James D.</div>
                  <div className="text-sm text-slate-500">Software Engineer</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/5 bg-slate-900/80 p-8 backdrop-blur">
              <div className="mb-4 flex gap-1">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="mb-6 text-lg leading-relaxed text-slate-300">
                "Finally, a coach that understands my busy schedule. The workout selection based on my equipment
                and recovery is spot on. Best investment in my health."
              </p>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 text-lg font-bold text-white">
                  SM
                </div>
                <div>
                  <div className="font-semibold text-white">Sarah M.</div>
                  <div className="text-sm text-slate-500">Marketing Director</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-24">
        <div className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-cyan-900/30 p-12 text-center backdrop-blur-xl md:p-16">
            {/* Glow effect */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-cyan-500/20 blur-3xl" />

            <div className="relative z-10">
              <h2 className="mb-4 text-4xl font-black text-white md:text-5xl">
                Ready to start your transformation?
              </h2>
              <p className="mb-8 text-xl text-slate-300">
                Join thousands who've achieved their fitness goals with AI-powered coaching
              </p>

              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-10 py-5 text-lg font-bold text-white shadow-2xl shadow-purple-500/30 transition hover:shadow-purple-500/50 hover:scale-105"
              >
                Get Started Free
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>

              <p className="mt-6 text-sm text-slate-500">
                No credit card required • Start tracking in 2 minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-950 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex flex-col items-center justify-between gap-6 md:flex-row">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 opacity-50 blur-md" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600">
                  <span className="text-base font-black text-white">M</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-black">
                  Moti<span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">vo</span>
                </h3>
                <p className="text-xs text-slate-500">AI Personal Training</p>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap gap-8 text-sm">
              <a href="#features" className="text-slate-400 transition hover:text-white">Features</a>
              <a href="#how-it-works" className="text-slate-400 transition hover:text-white">How it works</a>
              <Link href="/pricing" className="text-slate-400 transition hover:text-white">Pricing</Link>
              <a href="#results" className="text-slate-400 transition hover:text-white">Results</a>
              <Link href="/login" className="text-slate-400 transition hover:text-white">Login</Link>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-white/5 pt-8 text-center">
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Motivo AI Coach. All rights reserved.
            </p>
            <p className="mt-2 text-xs text-slate-600">
              Not medical advice. This is a coaching tool. Consult healthcare professionals for medical concerns.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
