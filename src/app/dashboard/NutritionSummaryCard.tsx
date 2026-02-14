"use client";

import type { FoodEntryRow } from "../lib/types";

type NutritionSummaryCardProps = {
  calorieTarget: number;
  caloriesLogged: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
  todayMeals: FoodEntryRow[];
  newMealDescription: string;
  setNewMealDescription: (v: string) => void;
  newMealCalories: string;
  setNewMealCalories: (v: string) => void;
  newMealType: string;
  setNewMealType: (v: string) => void;
  mealSaving: boolean;
  mealError: string | null;
  onAddMeal: () => void;
  onDeleteMeal: (id: string) => void;
};

export default function NutritionSummaryCard({
  calorieTarget,
  caloriesLogged,
  proteinTarget,
  carbsTarget,
  fatTarget,
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
}: NutritionSummaryCardProps) {
  const caloriePercentage = calorieTarget > 0 ? Math.min(100, (caloriesLogged / calorieTarget) * 100) : 0;
  const caloriesRemaining = Math.max(0, calorieTarget - caloriesLogged);

  return (
    <div className="glass-card p-6 transition-all duration-200">
      <h3 className="text-lg font-bold text-white">Nutrition Summary</h3>

      {/* Calorie display - shows remaining */}
      <div className="mt-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold text-white">{caloriesRemaining}</span>
          <span className="text-lg font-medium text-slate-500">kcal remaining</span>
        </div>
        <p className="mt-1 text-xs text-slate-500">{caloriesLogged} of {calorieTarget} kcal consumed</p>

        {/* Progress bar */}
        <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-slate-800/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700 ease-out"
            style={{ width: `${caloriePercentage}%` }}
          />
        </div>
      </div>

      {/* Macro breakdown - daily targets */}
      <div className="mt-5 flex items-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-purple-400" />
          <span className="font-medium text-slate-400">
            Protein <span className="font-bold text-white">{proteinTarget}g</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
          <span className="font-medium text-slate-400">
            Carbs <span className="font-bold text-white">{carbsTarget}g</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
          <span className="font-medium text-slate-400">
            Fats <span className="font-bold text-white">{fatTarget}g</span>
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-5 flex gap-3">
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("meal-form");
            if (el) el.classList.toggle("hidden");
          }}
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:from-blue-500 hover:to-cyan-500"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
          </svg>
          Add Meal
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-800/50 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-700/50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          Scan Barcode
        </button>
      </div>

      {/* Expandable meal form */}
      <div id="meal-form" className="mt-4 hidden">
        <div className="rounded-lg border border-white/[0.06] bg-slate-800/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={newMealType}
              onChange={(e) => setNewMealType(e.target.value)}
              className="w-full rounded-lg border border-white/[0.06] bg-slate-800/50 px-3 py-2.5 text-xs font-medium text-white outline-none transition-all duration-200 focus:border-white/5 sm:w-28"
            >
              <option value="Meal" className="bg-[#1e232d]">Meal</option>
              <option value="Breakfast" className="bg-[#1e232d]">Breakfast</option>
              <option value="Lunch" className="bg-[#1e232d]">Lunch</option>
              <option value="Dinner" className="bg-[#1e232d]">Dinner</option>
              <option value="Snack" className="bg-[#1e232d]">Snack</option>
            </select>

            <input
              type="text"
              placeholder="e.g. Chicken bowl with rice"
              className="w-full rounded-lg border border-white/[0.06] bg-slate-800/50 px-4 py-2.5 text-xs font-medium text-white placeholder-slate-600 outline-none transition-all duration-200 focus:border-white/5"
              value={newMealDescription}
              onChange={(e) => setNewMealDescription(e.target.value)}
            />

            <input
              type="number"
              placeholder="cals"
              className="w-24 rounded-lg border border-white/[0.06] bg-slate-800/50 px-4 py-2.5 text-xs font-medium text-white placeholder-slate-600 outline-none transition-all duration-200 focus:border-white/5"
              value={newMealCalories}
              onChange={(e) => setNewMealCalories(e.target.value)}
            />

            <button
              type="button"
              onClick={onAddMeal}
              disabled={mealSaving}
              className="rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2.5 text-xs font-bold text-white transition-all duration-200 hover:from-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {mealSaving ? "Adding..." : "Add"}
            </button>
          </div>

          {mealError && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-500/20 px-3 py-2">
              <svg className="h-4 w-4 text-rose-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-medium text-rose-300">{mealError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Meals list */}
      {todayMeals.length > 0 && (
        <div className="mt-4 space-y-2">
          {todayMeals.map((meal) => (
            <div
              key={meal.id}
              className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{meal.description}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span>{meal.meal_type || "Meal"}</span>
                  <span className="font-bold text-slate-400">{meal.calories} kcal</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDeleteMeal(meal.id)}
                className="ml-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-slate-600 transition-colors hover:bg-rose-500/20 hover:text-rose-400"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
