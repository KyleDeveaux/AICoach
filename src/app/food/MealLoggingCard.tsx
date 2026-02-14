"use client";

import { useState } from "react";
import type { FoodEntryRow } from "../lib/types";

type MealLoggingCardProps = {
  todayMeals: FoodEntryRow[];
  onAddMeal: (meal: {
    description: string;
    calories: number;
    meal_type: string;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  }) => Promise<void>;
  onDeleteMeal: (id: string) => void;
  isLoading: boolean;
  mealDeletingId: string | null;
};

export default function MealLoggingCard({
  todayMeals,
  onAddMeal,
  onDeleteMeal,
  isLoading,
  mealDeletingId,
}: MealLoggingCardProps) {
  const [mealType, setMealType] = useState("Meal");
  const [description, setDescription] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showMacros, setShowMacros] = useState(false);

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError("Please enter a meal description");
      return;
    }
    if (!calories || isNaN(Number(calories)) || Number(calories) <= 0) {
      setError("Please enter valid calories");
      return;
    }

    setError(null);
    try {
      await onAddMeal({
        description: description.trim(),
        calories: Number(calories),
        meal_type: mealType,
        protein_g: protein ? Number(protein) : null,
        carbs_g: carbs ? Number(carbs) : null,
        fat_g: fat ? Number(fat) : null,
      });

      // Clear form
      setDescription("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      setMealType("Meal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add meal");
    }
  };

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white">Log Meals</h3>
        <span className="text-xs text-slate-500">
          {todayMeals.length} meal{todayMeals.length !== 1 ? "s" : ""} today
        </span>
      </div>

      {/* Meal form - expanded by default */}
      <div className="mt-4 rounded-lg border border-white/[0.06] bg-slate-800/50 p-4">
        <div className="flex flex-col gap-3">
          {/* Row 1: Meal type and description */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full rounded-lg border border-white/[0.06] bg-slate-800/50 px-3 py-2.5 text-sm font-medium text-white outline-none transition-all duration-200 focus:border-white/10 sm:w-32"
            >
              <option value="Meal" className="bg-[#1e232d]">Meal</option>
              <option value="Breakfast" className="bg-[#1e232d]">Breakfast</option>
              <option value="Lunch" className="bg-[#1e232d]">Lunch</option>
              <option value="Dinner" className="bg-[#1e232d]">Dinner</option>
              <option value="Snack" className="bg-[#1e232d]">Snack</option>
            </select>

            <input
              type="text"
              placeholder="e.g. Grilled chicken with rice"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full flex-1 rounded-lg border border-white/[0.06] bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white placeholder-slate-600 outline-none transition-all duration-200 focus:border-white/10"
            />
          </div>

          {/* Row 2: Calories and toggle for macros */}
          <div className="flex items-center gap-3">
            <input
              type="number"
              placeholder="Calories"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="w-28 rounded-lg border border-white/[0.06] bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white placeholder-slate-600 outline-none transition-all duration-200 focus:border-white/10"
            />
            <button
              type="button"
              onClick={() => setShowMacros(!showMacros)}
              className="text-xs font-medium text-slate-500 transition-colors hover:text-white"
            >
              {showMacros ? "Hide macros" : "+ Add macros"}
            </button>
          </div>

          {/* Row 3: Optional macro inputs */}
          {showMacros && (
            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-purple-400" />
                <input
                  type="number"
                  placeholder="Protein (g)"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="w-28 rounded-lg border border-white/[0.06] bg-slate-800/50 px-3 py-2 text-xs font-medium text-white placeholder-slate-600 outline-none transition-all duration-200 focus:border-white/10"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-blue-400" />
                <input
                  type="number"
                  placeholder="Carbs (g)"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="w-28 rounded-lg border border-white/[0.06] bg-slate-800/50 px-3 py-2 text-xs font-medium text-white placeholder-slate-600 outline-none transition-all duration-200 focus:border-white/10"
                />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                <input
                  type="number"
                  placeholder="Fat (g)"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="w-28 rounded-lg border border-white/[0.06] bg-slate-800/50 px-3 py-2 text-xs font-medium text-white placeholder-slate-600 outline-none transition-all duration-200 focus:border-white/10"
                />
              </div>
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:from-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {isLoading ? "Adding..." : "Add Meal"}
          </button>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose-500/20 px-3 py-2">
            <svg
              className="h-4 w-4 text-rose-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-xs font-medium text-rose-300">{error}</p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-white/5 bg-slate-800/50 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-700/50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
            />
          </svg>
          Scan Barcode
        </button>
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
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="text-slate-500">{meal.meal_type || "Meal"}</span>
                  <span className="font-bold text-slate-400">{meal.calories} kcal</span>
                  {(meal.protein_g || meal.carbs_g || meal.fat_g) && (
                    <div className="flex items-center gap-2">
                      {meal.protein_g && (
                        <span className="text-purple-400">{meal.protein_g}g P</span>
                      )}
                      {meal.carbs_g && (
                        <span className="text-blue-400">{meal.carbs_g}g C</span>
                      )}
                      {meal.fat_g && (
                        <span className="text-cyan-400">{meal.fat_g}g F</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onDeleteMeal(meal.id)}
                disabled={mealDeletingId === meal.id}
                className="ml-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded text-slate-600 transition-colors hover:bg-rose-500/20 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mealDeletingId === meal.id ? (
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

      {todayMeals.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-white/10 px-4 py-6 text-center">
          <p className="text-sm text-slate-500">No meals logged today</p>
          <p className="mt-1 text-xs text-slate-600">Add your first meal above</p>
        </div>
      )}
    </div>
  );
}
