// lib/macros.ts

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
