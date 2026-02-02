"use client";

type WeeklyInsightsBarProps = {
  workoutsCompleted: number;
  workoutsPlanned: number;
  caloriesHitDays: number;
  coachMessage: string | null;
};

export default function WeeklyInsightsBar({
  workoutsCompleted,
  workoutsPlanned,
  caloriesHitDays,
  coachMessage,
}: WeeklyInsightsBarProps) {
  // Hardcoded steps data
  const avgSteps = 7200;

  return (
    <div className="glass-card p-6 transition-all duration-200">
      <h3 className="text-lg font-bold text-white">Weekly Insights</h3>

      <div className="mt-4 grid grid-cols-3 gap-6">
        {/* Workouts */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-slate-500">Workouts:</span>
            <span className="text-sm font-bold text-white">
              {workoutsCompleted} / {workoutsPlanned}
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: workoutsPlanned }).map((_, i) => (
              <div
                key={i}
                className={[
                  "h-2.5 flex-1 rounded-full",
                  i < workoutsCompleted ? "bg-blue-500" : "bg-slate-800/50",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        {/* Calories Hit */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-slate-500">Calories Hit:</span>
            <span className="text-sm font-bold text-white">
              {caloriesHitDays} / 7
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className={[
                  "h-2.5 flex-1 rounded-full",
                  i < caloriesHitDays ? (i < 4 ? "bg-cyan-500" : "bg-rose-500") : "bg-slate-800/50",
                ].join(" ")}
              />
            ))}
          </div>
        </div>

        {/* Avg Steps */}
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium text-slate-500">Avg Steps:</span>
            <span className="text-sm font-bold text-white">
              {avgSteps.toLocaleString()}
            </span>
          </div>
          <div className="mt-2 flex gap-1">
            {[6500, 8200, 7100, 5400, 9000, 7800, 6400].map((v, i) => (
              <div
                key={i}
                className="flex-1"
              >
                <div
                  className={[
                    "rounded-full",
                    v >= 7000 ? "bg-cyan-500" : "bg-amber-500",
                  ].join(" ")}
                  style={{ height: `${Math.max(4, (v / 10000) * 20)}px` }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Coach message */}
      <div className="mt-5 rounded-lg bg-slate-800/50 px-4 py-3">
        <p className="text-sm italic text-slate-400">
          {coachMessage || "Consistency is improving. Focus on getting 2k more steps each day."}
        </p>
      </div>
    </div>
  );
}
