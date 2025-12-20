"use client";

import React from "react";
import type { ClientProfile, FoodEntryRow, TodayPanelProps } from "../lib/types";

export default function TodayPanel({
  profile,
  todayLabel,
  calorieTarget,
  caloriesLogged,
  caloriesRemaining,
  plannedWorkouts,
  workoutsThisWeek,
  daysHitCalories,
  todayMeals,
  newMealDescription,
  setNewMealDescription,
  newMealCalories,
  setNewMealCalories,
  newMealType,
  setNewMealType,
  mealSaving,
  mealError,
  onAddMeal,
  onDeleteMeal,
}: TodayPanelProps) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Today
          </p>
          <h1 className="mt-1 text-xl font-semibold md:text-2xl">
            {profile
              ? `Welcome back, ${profile.first_name} 👋`
              : "Welcome back 👋"}
          </h1>
        </div>
        <p className="text-xs text-slate-500">{todayLabel}</p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.4fr_1fr]">
        {/* Calories summary */}
        <div className="rounded-xl bg-blue-50 p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
            Calories
          </p>
          <p className="mt-1 text-xs text-blue-700/70">
            Remaining = Target - Logged
          </p>

          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-24 w-24 md:h-28 md:w-28">
              <div className="absolute inset-0 rounded-full border-[6px] border-blue-100" />
              <div className="absolute inset-1 rounded-full border-[6px] border-blue-500/80" />
              <div className="relative flex h-full w-full items-center justify-center">
                <div className="text-center">
                  <div className="text-lg font-semibold md:text-xl">
                    {caloriesRemaining}
                  </div>
                  <div className="text-[11px] text-blue-700/70">
                    calories left
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 space-y-2 text-xs md:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Target</span>
                <span className="font-medium text-slate-900">
                  {calorieTarget}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Logged</span>
                <span className="text-slate-900">{caloriesLogged}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Remaining</span>
                <span
                  className={
                    caloriesRemaining >= 0
                      ? "font-medium text-emerald-600"
                      : "font-medium text-amber-600"
                  }
                >
                  {caloriesRemaining}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full bg-blue-500 transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(
                        0,
                        calorieTarget
                          ? (caloriesLogged / calorieTarget) * 100
                          : 0
                      )
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Workouts this week</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {workoutsThisWeek}
              <span className="text-sm font-normal text-slate-500">
                {" "}
                / {plannedWorkouts}
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Logged from Monday through today.
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs text-slate-500">Days on calories</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">
              {daysHitCalories}
              <span className="text-sm font-normal text-slate-500">
                {" "}
                / {7} days logged
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Only days with a check-in are counted.
            </p>
          </div>
        </div>
      </div>

      {/* Meals */}
      <div className="mt-4 space-y-3 text-sm">
        {/* Add meal form */}
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            value={newMealType}
            onChange={(e) => setNewMealType(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 sm:w-32"
          >
            <option value="Meal">Meal</option>
            <option value="Breakfast">Breakfast</option>
            <option value="Lunch">Lunch</option>
            <option value="Dinner">Dinner</option>
            <option value="Snack">Snack</option>
          </select>

          <input
            type="text"
            placeholder="e.g. Chicken bowl with rice"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
            value={newMealDescription}
            onChange={(e) => setNewMealDescription(e.target.value)}
          />

          <input
            type="number"
            placeholder="cals"
            className="w-24 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
            value={newMealCalories}
            onChange={(e) => setNewMealCalories(e.target.value)}
          />

          <button
            type="button"
            onClick={onAddMeal}
            disabled={mealSaving}
            className="rounded-full bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {mealSaving ? "Adding..." : "Add"}
          </button>
        </div>

        {mealError && <p className="text-xs text-rose-500">{mealError}</p>}

        {/* Meals list */}
        {todayMeals.length > 0 ? (
          <ul className="mt-3 space-y-2 text-xs">
            {todayMeals.map((meal) => (
              <li
                key={meal.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-slate-800">
                    {meal.description}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {meal.meal_type || "Meal"} • {meal.calories} kcal
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDeleteMeal(meal.id)}
                  className="text-[11px] font-medium text-slate-400 hover:text-rose-600"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-xs text-slate-500">
            No meals logged yet. Start by adding what you eat today – even if
            it&apos;s not perfect.
          </p>
        )}
      </div>
    </div>
  );
}
