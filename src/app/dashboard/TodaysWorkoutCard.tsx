"use client";

type Exercise = {
  name: string;
  reps: number;
  sets: number;
  notes: string | null;
  gifUrl: string | null;
  rest_seconds: number;
  gifSearchTerm: string;
};

type WorkoutDay = {
  dayOfWeek: string;
  workoutName: string;
  exercises: Exercise[];
};

type TodaysWorkoutCardProps = {
  selectedWorkout: WorkoutDay | null;
  onStartWorkout: () => void;
  onViewPlan: () => void;
};

export default function TodaysWorkoutCard({
  selectedWorkout,
  onStartWorkout,
  onViewPlan,
}: TodaysWorkoutCardProps) {
  const exercises = selectedWorkout?.exercises ?? [];
  const workoutName = selectedWorkout?.workoutName ?? "Rest Day";
  const isRestDay = exercises.length === 0;

  return (
    <div className="glass-card overflow-hidden transition-all duration-200">
      <div className="p-6">
        <h3 className="text-lg font-bold text-white">Today&apos;s Workout</h3>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm font-bold text-white">{workoutName}</span>
          {!isRestDay && (
            <span className="text-sm text-slate-500">· 45-60 min</span>
          )}
        </div>

        {isRestDay ? (
          <div className="mt-5 rounded-lg bg-slate-800/50 p-6 text-center">
            <svg className="mx-auto h-10 w-10 text-white/20" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <p className="mt-3 text-sm font-medium text-slate-500">
              No workout scheduled — rest up!
            </p>
          </div>
        ) : (
          <>
            {/* Exercise list */}
            <div className="mt-4 space-y-2">
              {exercises.slice(0, 5).map((ex, idx) => (
                <div
                  key={`${ex.name}-${idx}`}
                  className="flex items-center gap-3 rounded-lg bg-slate-800/50 px-3 py-2.5"
                  style={{ animation: `slideInX 0.3s ease-out ${idx * 0.05}s both` }}
                >
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-slate-800/50 text-xs font-bold text-slate-400">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-white">{ex.name}</p>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    {ex.sets} x {ex.reps}
                  </span>
                </div>
              ))}
              {exercises.length > 5 && (
                <p className="text-center text-xs text-slate-500">
                  +{exercises.length - 5} more exercises
                </p>
              )}
            </div>

            {/* Workout image placeholder */}
            <div className="mt-4 overflow-hidden rounded-xl">
              <div
                className="h-28 w-full bg-cover bg-center"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(30,35,45,0.5), rgba(30,35,45,0.2)), url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=600&q=80')",
                }}
              />
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={onStartWorkout}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
            Start Workout
          </button>

          <button
            type="button"
            onClick={onViewPlan}
            className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-800/50 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-700/50"
          >
            View Plan
          </button>
        </div>
      </div>
    </div>
  );
}
