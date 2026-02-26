"use client";

type WeekDayInfo = {
  dayName: string;
  dateLabel: string;
  isoDate: string;
  isToday?: boolean;
};

type WorkoutLogStatusType = "not_started" | "in_progress" | "completed";

type WeeklyCalendarBarProps = {
  weekDaysInfo: WeekDayInfo[];
  selectedDayName: string;
  onSelectDay: (dayName: string) => void;
  workoutDaysSet: Set<string>;
  logStatusMap: Record<string, WorkoutLogStatusType>;
};

export default function WeeklyCalendarBar({
  weekDaysInfo,
  selectedDayName,
  onSelectDay,
  workoutDaysSet,
  logStatusMap,
}: WeeklyCalendarBarProps) {
  return (
    <div className="glass-card p-4 transition-all duration-200">
      <div className="grid grid-cols-7 gap-2">
        {weekDaysInfo.map((d) => {
          const isSelected = d.dayName === selectedDayName;
          const isWorkoutDay = workoutDaysSet.has(d.dayName);
          const isToday = d.isToday;
          const logStatus = logStatusMap[d.dayName] ?? "not_started";

          return (
            <button
              key={d.isoDate}
              type="button"
              onClick={() => onSelectDay(d.dayName)}
              className={[
                "relative rounded-lg px-2 py-3 text-center transition-all duration-200",
                isSelected
                  ? "bg-gradient-to-br from-purple-600/80 to-blue-600/80 shadow-lg"
                  : "bg-slate-800/50 hover:bg-slate-700/50",
              ].join(" ")}
            >
              {/* Today dot */}
              {isToday && !isSelected && (
                <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-blue-500" />
              )}

              {/* Day abbreviation */}
              <p
                className={[
                  "text-[10px] font-bold tracking-wider",
                  isSelected ? "text-white/90" : "text-slate-500",
                ].join(" ")}
              >
                {d.dayName.slice(0, 3).toUpperCase()}
              </p>

              {/* Date number */}
              <p
                className={[
                  "mt-1 text-sm font-bold",
                  isSelected ? "text-white" : "text-slate-300",
                ].join(" ")}
              >
                {d.dateLabel.split(" ")[1] ?? d.dateLabel}
              </p>

              {/* Status indicator */}
              <div className="mt-2 flex items-center justify-center">
                {isWorkoutDay ? (
                  logStatus === "completed" ? (
                    <div
                      className={[
                        "flex h-5 w-5 items-center justify-center rounded",
                        isSelected ? "bg-white/20" : "bg-emerald-500/20",
                      ].join(" ")}
                    >
                      <svg
                        className={[
                          "h-3 w-3",
                          isSelected ? "text-white" : "text-emerald-400",
                        ].join(" ")}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  ) : logStatus === "in_progress" ? (
                    <div
                      className={[
                        "flex h-5 w-5 items-center justify-center rounded",
                        isSelected ? "bg-white/20" : "bg-amber-500/20",
                      ].join(" ")}
                    >
                      <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
                    </div>
                  ) : (
                    <div
                      className={[
                        "flex h-5 w-5 items-center justify-center rounded",
                        isSelected ? "bg-white/20" : "bg-cyan-500/20",
                      ].join(" ")}
                    >
                      <svg
                        className={[
                          "h-3 w-3",
                          isSelected ? "text-white" : "text-cyan-400",
                        ].join(" ")}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13 10V3L4 14h7v7l9-11h-7z"
                        />
                      </svg>
                    </div>
                  )
                ) : (
                  <div className="h-2 w-2 rounded-full bg-slate-700" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
