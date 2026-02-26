"use client";

type MacroProgressSectionProps = {
  proteinCurrent: number;
  proteinTarget: number;
  carbsCurrent: number;
  carbsTarget: number;
  fatCurrent: number;
  fatTarget: number;
  caloriesLogged: number;
  calorieTarget: number;
};

type MacroCircleProps = {
  label: string;
  current: number;
  target: number;
  color: "purple" | "blue" | "cyan";
  size?: number;
};

const colorMap = {
  purple: { stroke: "#a855f7", text: "text-purple-400" },
  blue: { stroke: "#3b82f6", text: "text-blue-400" },
  cyan: { stroke: "#06b6d4", text: "text-cyan-400" },
};

function MacroCircle({ label, current, target, color, size = 120 }: MacroCircleProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const remaining = Math.max(0, target - current);

  const colors = colorMap[color];

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="h-full w-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>

        {/* Center text - shows remaining */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-xl font-bold text-white">{remaining}g</div>
            <div className="text-xs font-medium text-slate-500">left</div>
          </div>
        </div>
      </div>
      <p className={`mt-2 text-sm font-medium ${colors.text}`}>{label}</p>
    </div>
  );
}

export default function MacroProgressSection({
  proteinCurrent,
  proteinTarget,
  carbsCurrent,
  carbsTarget,
  fatCurrent,
  fatTarget,
  caloriesLogged,
  calorieTarget,
}: MacroProgressSectionProps) {
  const caloriePercentage =
    calorieTarget > 0 ? Math.min(100, (caloriesLogged / calorieTarget) * 100) : 0;
  const caloriesRemaining = Math.max(0, calorieTarget - caloriesLogged);

  return (
    <div className="glass-card p-6">
      {/* Calorie header with progress bar - shows remaining */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-white">Daily Nutrition</h3>
        <div className="mt-4">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{caloriesRemaining}</span>
            <span className="text-lg font-medium text-slate-500">kcal remaining</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{caloriesLogged} of {calorieTarget} kcal consumed</p>
          <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-slate-800/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700 ease-out"
              style={{ width: `${caloriePercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Macro circles grid */}
      <div className="flex justify-around">
        <MacroCircle
          label="Protein"
          current={proteinCurrent}
          target={proteinTarget}
          color="purple"
        />
        <MacroCircle
          label="Carbs"
          current={carbsCurrent}
          target={carbsTarget}
          color="blue"
        />
        <MacroCircle
          label="Fats"
          current={fatCurrent}
          target={fatTarget}
          color="cyan"
        />
      </div>
    </div>
  );
}
