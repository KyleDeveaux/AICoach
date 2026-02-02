"use client";

type TodaysScoreCardProps = {
  didWorkout: boolean | null;
  hitCalories: boolean | null;
  score: number;
};

export default function TodaysScoreCard({
  didWorkout,
  hitCalories,
  score,
}: TodaysScoreCardProps) {
  const circumference = 2 * Math.PI * 54;
  const scorePercent = Math.min(100, Math.max(0, score));
  const strokeDashoffset = circumference - (scorePercent / 100) * circumference;

  // Color the arc based on score
  const arcColor =
    score >= 70 ? "#06b6d4" : score >= 40 ? "#f59e0b" : "#ef4444";

  const stepsInProgress = true; // placeholder

  return (
    <div className="glass-card p-6 transition-all duration-200">
      <h3 className="text-lg font-bold text-white">Today&apos;s Score</h3>

      <div className="mt-4 flex items-center gap-6">
        {/* Circular gauge */}
        <div className="relative h-36 w-36 flex-shrink-0">
          <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="54"
              fill="none"
              stroke={arcColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-700 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-white">{score}</div>
              <div className="text-sm font-medium text-slate-500">/ 100</div>
            </div>
          </div>
        </div>

        {/* Status items */}
        <div className="flex-1 space-y-3">
          <StatusItem
            label="Workout Complete"
            status={didWorkout === true ? "done" : didWorkout === false ? "missed" : "pending"}
          />
          <StatusItem
            label={hitCalories === false ? "Calories Over Goal" : "Calories On Target"}
            status={hitCalories === true ? "done" : hitCalories === false ? "missed" : "pending"}
          />
          <StatusItem
            label="Steps In Progress"
            status={stepsInProgress ? "done" : "pending"}
          />
        </div>
      </div>
    </div>
  );
}

function StatusItem({
  label,
  status,
}: {
  label: string;
  status: "done" | "missed" | "pending";
}) {
  return (
    <div className="flex items-center gap-2">
      {status === "done" && (
        <svg className="h-5 w-5 text-cyan-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )}
      {status === "missed" && (
        <svg className="h-5 w-5 text-rose-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      {status === "pending" && (
        <svg className="h-5 w-5 text-slate-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      )}
      <span className="text-sm font-medium text-slate-400">{label}</span>
    </div>
  );
}
