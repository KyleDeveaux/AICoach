"use client";

import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import type { InitialPlanResponse, WeeklySummaryResponse } from "../lib/types";
import { saveClientProfile } from "../lib/saveClientProfile";
import { DailyCalorieNeeds } from "../lib/macros";

// If GoalType is exported from lib/types, import it instead of redefining:
type GoalType = "lose_weight" | "gain_muscle" | "recomp";

type ClientProfileFormState = {
  first_name: string;
  last_name: string;
  age: string; // keep as string in form, convert to number before sending
  gender: "male" | "female" | "other";
  height_feet: string;
  height_inches: string;
  weight_lbs: string;
  goalType: GoalType;
  goalWeight_lbs: string;
  currentWorkoutsPerWeek: string;
  realisticWorkoutsPerWeek: string;
  workSchedule: string;
  preferredWorkoutTime: string;
  equipment: "none" | "home_gym" | "commercial_gym";
  estimatedSteps: string; // e.g. "9k-10k"
  //   phoneNumber?: string;
  //   email?: string;
  //   consentToCall?: boolean;
};

const initialFormState: ClientProfileFormState = {
  first_name: "",
  last_name: "",
  age: "",
  gender: "male",
  height_feet: "",
  height_inches: "",
  weight_lbs: "",
  goalType: "lose_weight",
  goalWeight_lbs: "",
  currentWorkoutsPerWeek: "",
  realisticWorkoutsPerWeek: "",
  workSchedule: "",
  preferredWorkoutTime: "Morning",
  equipment: "commercial_gym",
  estimatedSteps: "5k-7k",
  //   phoneNumber: "",
  //   consentToCall: false,
};

export default function OnboardingPage() {
  const [form, setForm] = useState<ClientProfileFormState>(initialFormState);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<InitialPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);


  function updateField<K extends keyof ClientProfileFormState>(
    key: K,
    value: ClientProfileFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPlan(null);

    const heightFeet = Number(form.height_feet);
    const heightInches = Number(form.height_inches || "0");
    const weightLbs = Number(form.weight_lbs);
    const goalWeightLbs = Number(form.goalWeight_lbs);

    const height_cm = heightFeet * 30.48 + heightInches * 2.54;
    const weight_kg = weightLbs / 2.20462;
    const goalWeight_kg = goalWeightLbs / 2.20462;

    // lbs → kg
    const kgFromLbs = (lbs: number) => lbs / 2.20462;

    // ft + in → cm
    const cmFromFeetInches = (feet: number, inches: number) =>
      feet * 30.48 + inches * 2.54;

    // Very basic required-field check
    if (
      !form.first_name ||
      !form.last_name ||
      !form.age ||
      !form.height_feet ||
      !form.height_inches ||
      !form.weight_lbs ||
      !form.goalWeight_lbs ||
      !form.currentWorkoutsPerWeek ||
      !form.realisticWorkoutsPerWeek
    ) {
      setLoading(false);
      setError("Please fill in all required fields.");
      return;
    }
    console.log(
      "Submitting form with height_cm:",
      height_cm,
      "weight_kg:",
      weight_kg
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("You must be logged in to complete onboarding.");
      return;
    }

    // 1) Build base profile (no macros yet)
    const clientProfileBase = {
      first_name: form.first_name,
      last_name: form.last_name,
      age: Number(form.age),
      gender: form.gender,
      height_cm: Math.round(height_cm),
      weight_kg: Number(weight_kg.toFixed(1)),
      goalType: form.goalType,
      goalWeight_kg: Number(goalWeight_kg.toFixed(1)),
      currentWorkoutsPerWeek: Number(form.currentWorkoutsPerWeek),
      realisticWorkoutsPerWeek: Number(form.realisticWorkoutsPerWeek),
      workSchedule: form.workSchedule,
      preferredWorkoutTime: form.preferredWorkoutTime,
      equipment: form.equipment,
      estimatedSteps: form.estimatedSteps,
    };

    // 2) Calculate TDEE and calorie target
    const tdee = DailyCalorieNeeds(
      clientProfileBase.weight_kg,
      clientProfileBase.height_cm,
      clientProfileBase.age,
      clientProfileBase.gender,
      clientProfileBase.realisticWorkoutsPerWeek
    );

    let calorieTarget = tdee;
    if (clientProfileBase.goalType === "lose_weight") {
      calorieTarget = tdee * 0.8; // ~20% deficit
    } else if (clientProfileBase.goalType === "gain_muscle") {
      calorieTarget = tdee * 1.1; // ~10% surplus
    } else {
      // recomp
      calorieTarget = tdee * 0.95;
    }

    // Round to nearest 50
    calorieTarget = Math.round(calorieTarget / 50) * 50;

    // 3) Macro targets object we send to the API
    const macroTargets = {
      calorieTarget: Math.round(calorieTarget),
      // later: proteinTarget_g, fatTarget_g, carbTarget_g
    };

    // 4) Final clientProfile including calorieTarget (for DB + API)
    const clientProfile = {
      ...clientProfileBase,
      calorieTarget: macroTargets.calorieTarget,
    };

    // 5) Temporary hard-coded callAnswers (you'll collect these later)
    const callAnswers = {
      why: "I want to improve my health and feel more confident.",
      futureVision:
        "In 6 months I want to feel leaner, stronger, and more energetic.",
      pastStruggles: "I struggle with consistency when life gets busy.",
      planRealismRating: 8,
      notes: "Prefers simple meals and hates complicated recipes.",
    };

    try {
      // 6) Save profile to Supabase
      const inserted = await saveClientProfile(clientProfile, user.id);
      const profileId = inserted.id; // uuid from DB

      // 7) Call your OpenAI API with profile + macros + call answers
      const res = await fetch("/api/generate-initial-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientProfile,
          callAnswers,
          macroTargets,
          profileId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }

      const data = (await res.json()) as InitialPlanResponse;
      setPlan(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Onboarding</h1>
      <p className="text-gray-600 text-sm">
        Tell your coach about you so we can build your first plan.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              First Name *
            </label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Last Name *
            </label>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
            />
          </div>
        </div>

        {/* Age, Gender */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Age *</label>
            <input
              type="number"
              min={16}
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.age}
              onChange={(e) => updateField("age", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Gender</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.gender}
              onChange={(e) =>
                updateField(
                  "gender",
                  e.target.value as ClientProfileFormState["gender"]
                )
              }
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / Prefer not to say</option>
            </select>
          </div>
        </div>

        {/* Height, Weight, Goal Weight */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Height *</label>
            <div className="flex gap-2">
              <input
                type="number"
                min={3}
                max={7}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="ft"
                value={form.height_feet}
                onChange={(e) => updateField("height_feet", e.target.value)}
              />
              <input
                type="number"
                min={0}
                max={11}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="in"
                value={form.height_inches}
                onChange={(e) => updateField("height_inches", e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Current Weight (lbs) *
            </label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.weight_lbs}
              onChange={(e) => updateField("weight_lbs", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Goal Weight (lbs) *
            </label>
            <input
              type="number"
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.goalWeight_lbs}
              onChange={(e) => updateField("goalWeight_lbs", e.target.value)}
            />
          </div>
        </div>

        {/* Goal Type, Equipment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Goal Type *
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.goalType}
              onChange={(e) =>
                updateField("goalType", e.target.value as GoalType)
              }
            >
              <option value="lose_weight">Lose weight</option>
              <option value="gain_muscle">Gain muscle</option>
              <option value="recomp">Body recomposition</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Equipment Access *
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.equipment}
              onChange={(e) =>
                updateField(
                  "equipment",
                  e.target.value as ClientProfileFormState["equipment"]
                )
              }
            >
              <option value="none">No equipment</option>
              <option value="home_gym">Some home equipment</option>
              <option value="commercial_gym">Full gym access</option>
            </select>
          </div>
        </div>

        {/* Workouts per week */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Currently working out (days/week) *
            </label>
            <input
              type="number"
              min={0}
              max={7}
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.currentWorkoutsPerWeek}
              onChange={(e) =>
                updateField("currentWorkoutsPerWeek", e.target.value)
              }
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Realistically can commit to (days/week) *
            </label>
            <input
              type="number"
              min={1}
              max={7}
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.realisticWorkoutsPerWeek}
              onChange={(e) =>
                updateField("realisticWorkoutsPerWeek", e.target.value)
              }
            />
          </div>
        </div>
        {/* Consent to call */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Phone Number*
            </label>
            <input
              type="string"
              //   min={0}
              //   max={7}
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.phoneNumber}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Does the coach have permission to call? *
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.consentToCall ? "true" : "false"}
              onChange={(e) =>
                updateField("consentToCall", e.target.value === "true")
              }
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div> */}

        {/* Work schedule, preferred workout time */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">
            Work Schedule (e.g. Mon–Fri 9–5)
          </label>
          <input
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="Mon–Fri 9–5"
            value={form.workSchedule}
            onChange={(e) => updateField("workSchedule", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Preferred Workout Time
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.preferredWorkoutTime}
              onChange={(e) =>
                updateField("preferredWorkoutTime", e.target.value)
              }
            >
              <option value="Morning">Morning</option>
              <option value="Lunch">Lunch</option>
              <option value="Evening">Evening</option>
              <option value="Flexible">Flexible</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Estimated Steps per Day
            </label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={form.estimatedSteps}
              onChange={(e) => updateField("estimatedSteps", e.target.value)}
            >
              <option value="0-3k">0–3k</option>
              <option value="3k-5k">3k–5k</option>
              <option value="5k-7k">5k–7k</option>
              <option value="7k-9k">7k–9k</option>
              <option value="9k-10k">9k–10k</option>
              <option value="10k+">10k+</option>
            </select>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="mt-4 px-4 py-2 rounded bg-black text-white disabled:opacity-60"
        >
          {loading ? "Generating your plan..." : "Generate My Plan"}
        </button>

        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      </form>

      {plan && (
        <section className="mt-6 space-y-3 border-t pt-4">
          <h2 className="text-xl font-semibold">Your Plan</h2>
          <p className="whitespace-pre-line text-sm">{plan.planSummary}</p>

          <div className="grid grid-cols-2 gap-4 text-sm mt-2">
            <div>
              <p>
                Calories: <strong>{plan.calorieTarget}</strong>
              </p>
              <p>
                Protein: <strong>{plan.proteinTarget_g} g</strong>
              </p>
              <p>
                Workouts/week: <strong>{plan.workoutsPerWeek}</strong>
              </p>
              <p>
                Step target: <strong>{plan.stepTarget}</strong>
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
