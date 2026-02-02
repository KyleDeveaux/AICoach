"use client";

type GreetingHeaderProps = {
  firstName: string;
  streakCount: number;
  onOpenWeeklyRecap: () => void;
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function GreetingHeader({
  firstName,
  streakCount,
  onOpenWeeklyRecap,
}: GreetingHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <h1 className="text-2xl font-bold text-white md:text-3xl">
        {getGreeting()}, {firstName} 👋
      </h1>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 px-4 py-2">
          <svg className="h-4 w-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
          </svg>
          <span className="text-sm font-bold text-white">
            Streak: {streakCount} {streakCount === 1 ? "Day" : "Days"}
          </span>
        </div>

        <button
          type="button"
          onClick={onOpenWeeklyRecap}
          className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-800/50 px-4 py-2 text-sm font-bold text-slate-400 transition-all duration-200 hover:bg-slate-700/50"
        >
          Weekly Recap
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
