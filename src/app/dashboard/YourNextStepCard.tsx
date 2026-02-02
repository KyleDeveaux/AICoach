"use client";

type YourNextStepCardProps = {
  suggestion: string;
  coachTip: string | null;
  onLogWorkout: () => void;
  onLogFood: () => void;
  onQuickCheckin: () => void;
};

export default function YourNextStepCard({
  suggestion,
  coachTip,
  onLogWorkout,
  onLogFood,
  onQuickCheckin,
}: YourNextStepCardProps) {
  return (
    <div className="glass-card flex flex-col p-6 transition-all duration-200">
      <h3 className="text-lg font-bold text-white">Your Next Step</h3>

      <p className="mt-3 text-sm leading-relaxed text-slate-400">
        {suggestion}
      </p>

      {/* Action buttons */}
      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onLogWorkout}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Log Workout
        </button>

        <button
          type="button"
          onClick={onLogFood}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-blue-500"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
          Log Food
        </button>

      </div>

      {/* Coach Tip */}
      <div className="mt-5 flex items-start gap-2 rounded-lg bg-slate-800/50 px-4 py-3">
        <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
        </svg>
        <p className="text-xs font-medium text-slate-400">
          <span className="font-bold text-white/80">Coach Tip:</span>{" "}
          {coachTip || "Prioritize protein early!"}
        </p>
      </div>

      {/* Nature banner image */}
      <div className="mt-5 overflow-hidden rounded-xl">
        <div
          className="h-32 w-full bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(30,35,45,0.3), rgba(30,35,45,0.1)), url('https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80')",
          }}
        />
      </div>
    </div>
  );
}
