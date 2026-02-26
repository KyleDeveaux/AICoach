// lib/macros.ts

export type GoalType = "lose_weight" | "gain_muscle" | "recomp";

export interface MacroTargets {
  calorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}

/**
 * Calculate macro targets based on calories, weight, and goal type.
 *
 * Formula:
 * - Protein: weight_kg × multiplier (based on goal)
 *   - Lose weight: 2.0g/kg (higher to preserve muscle in deficit)
 *   - Gain muscle: 1.8g/kg
 *   - Maintain/recomp: 1.6g/kg
 * - Fat: 25% of total calories
 * - Carbs: Remaining calories after protein and fat
 */
export function calculateMacros(
  calorieTarget: number,
  weightKg: number,
  goalType: GoalType
): MacroTargets {
  // Protein multiplier based on goal (grams per kg of body weight)
  const proteinMultiplier =
    goalType === "lose_weight" ? 2.0 :
    goalType === "gain_muscle" ? 1.8 :
    1.6; // recomp/maintain

  // Calculate protein (g)
  const proteinTarget = Math.round(weightKg * proteinMultiplier);
  const proteinCalories = proteinTarget * 4;

  // Fat is 25% of total calories
  const fatCalories = calorieTarget * 0.25;
  const fatTarget = Math.round(fatCalories / 9);

  // Carbs fill the remaining calories
  const carbCalories = calorieTarget - proteinCalories - fatCalories;
  const carbsTarget = Math.round(Math.max(0, carbCalories) / 4);

  return {
    calorieTarget,
    proteinTarget,
    carbsTarget,
    fatTarget,
  };
}

export const DailyCalorieNeeds = (
  weight_kg: number,
  height_cm: number,
  age: number,
  gender: string,
  realisticWorkoutsPerWeek: number
) => {
  let BMR: number;

  if (gender === "male") {
    BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5;
  } else {
    BMR = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161;
  }

  if (realisticWorkoutsPerWeek <= 1) {
    return BMR * 1.2; // Sedentary
  } else if (realisticWorkoutsPerWeek <= 3) {
    return BMR * 1.375; // Lightly active
  } else if (realisticWorkoutsPerWeek <= 5) {
    return BMR * 1.55; // Moderately active
  } else if (realisticWorkoutsPerWeek <= 6) {
    return BMR * 1.725; // Very active
  } else {
    return BMR * 1.9; // Extra active
  }
};
