"use client";

import React from "react";

type WeekDayInfo = {
  dayName: string;
  dateLabel: string;
  isoDate: string;
  isToday?: boolean;
};

type Exercise = {
  name: string;
  sets: number;
  reps: number;
};

type WorkoutDay = {
  dayOfWeek: string;
  exercises: Exercise[];
};

type WorkoutPlanCardProps = {
  weekDaysInfo: WeekDayInfo[];
  selectedDayName: string;
  setSelectedDayName: (value: string) => void;
  selectedWorkout: WorkoutDay | null;
  workoutDaysSet: Set<string>;
};

export default function WorkoutPlanCard({
  weekDaysInfo,
  selectedDayName,
  setSelectedDayName,
  selectedWorkout,
  workoutDaysSet,
}: WorkoutPlanCardProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold md:text-lg">
          Weekly workout plan
        </h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
          {selectedDayName}
        </span>
      </div>

      {/* Calendar row */}
      <div className="mt-4 rounded-xl bg-slate-50 p-2">
        <div className="flex justify-between gap-1">
          {weekDaysInfo.map((day) => {
            const isSelected = day.dayName === selectedDayName;
            const hasWorkout = workoutDaysSet.has(day.dayName);

            return (
              <button
                key={day.dayName}
                type="button"
                onClick={() => setSelectedDayName(day.dayName)}
                className={[
                  "flex flex-1 flex-col items-center justify-center rounded-lg px-1 py-1.5 text-[11px] md:px-2 md:py-2 transition",
                  isSelected
                    ? "bg-blue-600 text-white shadow-sm"
                    : day.isToday
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100",
                ].join(" ")}
              >
                <span className="uppercase tracking-wide">
                  {day.dayName.slice(0, 3)}
                </span>
                <span className="text-xs">{day.dateLabel}</span>
                {hasWorkout && (
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day workout */}
      <div className="mt-4">
        {selectedWorkout ? (
          <ul className="space-y-2 text-sm">
            {selectedWorkout.exercises.map((ex) => (
              <li
                key={ex.name}
                className="flex items-baseline justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <span className="font-medium text-slate-800">{ex.name}</span>
                <span className="text-xs text-slate-500">
                  {ex.sets} × {ex.reps}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-600">
            No lifting planned for {selectedDayName}. This can be a rest / steps
            day or a chance to make up a missed session.
          </p>
        )}
      </div>
    </div>
  );
}
