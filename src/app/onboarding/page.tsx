"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import type { InitialPlanResponse } from "../lib/types";
import { saveClientProfile } from "../lib/saveClientProfile";
import { DailyCalorieNeeds } from "../lib/macros";

type GoalType = "lose_weight" | "gain_muscle" | "recomp";

type ClientProfileFormState = {
  first_name: string;
  last_name: string;
  age: string;
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
  estimatedSteps: string;
  phoneNumber: string;
  email: string;
  consentToCall: boolean;
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
  phoneNumber: "",
  email: "",
  consentToCall: false,
};

export default function OnboardingPage() {
  const router = useRouter();

  const [form, setForm] = useState<ClientProfileFormState>(initialFormState);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<InitialPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  function updateField<K extends keyof ClientProfileFormState>(
    key: K,
    value: ClientProfileFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // -------- Steps definition --------
  const steps = [
    {
      id: "name",
      title: "Let’s start with your name",
      description: "Your coach will use this to speak to you personally.",
      required: ["first_name", "last_name"] as (keyof ClientProfileFormState)[],
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              First name *
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              value={form.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Last name *
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              value={form.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
            />
          </div>
        </div>
      ),
    },
    {
      id: "age-gender",
      title: "Basic details",
      description: "These help us estimate your calorie needs.",
      required: ["age", "gender"] as (keyof ClientProfileFormState)[],
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Age *
            </label>
            <input
              type="number"
              min={16}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              value={form.age}
              onChange={(e) => updateField("age", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Gender
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
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
              <option value="other">Other / prefer not to say</option>
            </select>
          </div>
        </div>
      ),
    },
    {
      id: "body",
      title: "Your height & weight",
      description: "We’ll use this to calculate a starting plan.",
      required: [
        "height_feet",
        "height_inches",
        "weight_lbs",
        "goalWeight_lbs",
      ] as (keyof ClientProfileFormState)[],
      content: (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Height *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={3}
                max={7}
                placeholder="ft"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                value={form.height_feet}
                onChange={(e) => updateField("height_feet", e.target.value)}
              />
              <input
                type="number"
                min={0}
                max={11}
                placeholder="in"
                className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                value={form.height_inches}
                onChange={(e) => updateField("height_inches", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Current weight (lbs) *
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              value={form.weight_lbs}
              onChange={(e) => updateField("weight_lbs", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Goal weight (lbs) *
            </label>
            <input
              type="number"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              value={form.goalWeight_lbs}
              onChange={(e) => updateField("goalWeight_lbs", e.target.value)}
            />
          </div>
        </div>
      ),
    },
    {
      id: "goal-equipment",
      title: "Goal & equipment",
      description:
        "We’ll match your training split to your goal and what you have access to.",
      required: ["goalType", "equipment"] as (keyof ClientProfileFormState)[],
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Main goal *
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
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
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Equipment access *
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
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
      ),
    },
    {
      id: "workouts",
      title: "How often can you realistically train?",
      description:
        "We’d rather give you 3 days you can stick to than 6 you can’t.",
      required: [
        "currentWorkoutsPerWeek",
        "realisticWorkoutsPerWeek",
      ] as (keyof ClientProfileFormState)[],
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Currently working out (days/week) *
            </label>
            <input
              type="number"
              min={0}
              max={7}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              value={form.currentWorkoutsPerWeek}
              onChange={(e) =>
                updateField("currentWorkoutsPerWeek", e.target.value)
              }
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Realistically can commit to (days/week) *
            </label>
            <input
              type="number"
              min={1}
              max={7}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              value={form.realisticWorkoutsPerWeek}
              onChange={(e) =>
                updateField("realisticWorkoutsPerWeek", e.target.value)
              }
            />
          </div>
        </div>
      ),
    },
    {
      id: "schedule-steps",
      title: "Your schedule & daily movement",
      description: "We’ll align your step and workout targets with real life.",
      required: [
        "workSchedule",
        "estimatedSteps",
      ] as (keyof ClientProfileFormState)[],
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Work schedule (e.g. Mon–Fri 9–5)
            </label>
            <input
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              placeholder="Mon–Fri 9–5"
              value={form.workSchedule}
              onChange={(e) => updateField("workSchedule", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Preferred workout time
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
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
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Estimated steps per day
            </label>
            <select
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
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
      ),
    },
    {
      id: "contact",
      title: "How can your coach reach you?",
      description:
        "We’ll use this for weekly check-in calls and important updates.",
      required: ["email", "phoneNumber"] as (keyof ClientProfileFormState)[],
      content: (
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Email *
            </label>
            <input
              type="email"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-800">
              Phone number *
            </label>
            <input
              type="tel"
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
              placeholder="(555) 123-4567"
              value={form.phoneNumber}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={form.consentToCall}
              onChange={(e) => updateField("consentToCall", e.target.checked)}
            />
            <span>
              I agree to receive automated or AI-driven calls/messages related
              to my coaching plan. I understand this is not medical advice.
            </span>
          </label>
        </div>
      ),
    },
  ];

  const totalSteps = steps.length;

  // 🔹 Progress: 0% on first step, 100% on last step
  const progress =
    totalSteps > 1 ? Math.round((currentStep / (totalSteps - 1)) * 100) : 100;

  const isLastStep = currentStep === totalSteps - 1;

  function validateCurrentStep(): boolean {
    const step = steps[currentStep];
    for (const key of step.required) {
      const value = form[key];
      if (value === "" || value === null || value === undefined) {
        setError("Please complete this step before continuing.");
        return false;
      }
    }
    setError(null);
    return true;
  }

  async function handleFinalSubmit() {
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

    if (
      !form.first_name ||
      !form.last_name ||
      !form.age ||
      !form.height_feet ||
      !form.height_inches ||
      !form.weight_lbs ||
      !form.goalWeight_lbs ||
      !form.currentWorkoutsPerWeek ||
      !form.realisticWorkoutsPerWeek ||
      !form.email ||
      !form.phoneNumber
    ) {
      setLoading(false);
      setError("Please fill in all required fields.");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setLoading(false);
      setError("You must be logged in to complete onboarding.");
      return;
    }

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
      phone_number: form.phoneNumber,
      email: form.email,
      consent_to_call: form.consentToCall,
    };

    const tdee = DailyCalorieNeeds(
      clientProfileBase.weight_kg,
      clientProfileBase.height_cm,
      clientProfileBase.age,
      clientProfileBase.gender,
      clientProfileBase.realisticWorkoutsPerWeek
    );

    let calorieTarget = tdee;
    if (clientProfileBase.goalType === "lose_weight") {
      calorieTarget = tdee * 0.8;
    } else if (clientProfileBase.goalType === "gain_muscle") {
      calorieTarget = tdee * 1.1;
    } else {
      calorieTarget = tdee * 0.95;
    }

    calorieTarget = Math.round(calorieTarget / 50) * 50;

    const macroTargets = {
      calorieTarget: Math.round(calorieTarget),
    };

    const clientProfileForDb = {
      ...clientProfileBase,
      calorie_target: macroTargets.calorieTarget,
    };

    const callAnswers = {
      why: "I want to feel healthier, more confident, and proud of my body.",
      futureVision:
        "In 6–12 months I want to feel leaner, stronger, and more energetic.",
      pastStruggles:
        "I struggle with consistency when life gets busy or when I eat out often.",
      planRealismRating: 8,
      notes: "Prefers simple meals and clear structure.",
    };

    try {
      const inserted = await saveClientProfile(clientProfileForDb, user.id);
      const profileId = inserted.id;

      const res = await fetch("/api/generate-initial-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientProfile: clientProfileForDb,
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

      // Redirect to dashboard once everything is set
      router.push("/dashboard");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (!validateCurrentStep()) return;
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      void handleFinalSubmit();
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setError(null);
    }
  }

  const step = steps[currentStep];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      {/* Top banner */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
              <span className="text-sm font-bold">AI</span>
            </div>
            <div className="leading-tight">
              <a
                className="text-base font-semibold tracking-tight text-slate-900"
                href="/"
              >
                Coach<span className="text-blue-600">IE</span>
              </a>
              <p className="text-[11px] text-slate-500">
                Onboarding • Build your first plan
              </p>
            </div>
          </div>

          <div className="hidden text-right text-[11px] text-slate-500 sm:block">
            <p className="font-medium text-slate-700">
              Step {currentStep + 1} of {totalSteps}
            </p>
            <p>About 2–3 minutes to complete</p>
          </div>
        </div>
      </header>

      {/* Main content, slightly lower from header */}
      <div className="mx-auto max-w-4xl px-4 pt-8 pb-10 md:pt-10 md:pb-12">
        {/* 👇 Center this whole block */}
        <div className="w-full max-w-xl mx-auto">
          {/* Progress bar – same width as question box */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Onboarding progress</span>
              <span>{progress}%</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Question card */}
          <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-semibold text-slate-900">
              {step.title}
            </h2>
            <p className="mt-1 text-xs text-slate-500">{step.description}</p>

            <div className="mt-4 space-y-4">{step.content}</div>

            {error && <p className="mt-3 text-xs text-rose-500">{error}</p>}

            <div
              className={
                "mt-6 flex items-center " +
                (isLastStep ? "justify-center" : "justify-between")
              }
            >
              {!isLastStep && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={currentStep === 0 || loading}
                  className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Back
                </button>
              )}

              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
              >
                {loading
                  ? "Saving..."
                  : isLastStep
                  ? "Start generating my plan"
                  : "Next"}
              </button>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-500">
            CoachIE is a coaching tool, not a medical service. For any medical
            concerns or conditions, always consult a healthcare professional.
          </p>
        </div>
      </div>
    </main>
  );
}
