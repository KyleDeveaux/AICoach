// app/onboarding/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import type { InitialPlanResponse } from "../lib/types";
import { saveClientProfile } from "../lib/saveClientProfile";
import { DailyCalorieNeeds } from "../lib/macros";
import { normalizePhoneNumberToE164 } from "../lib/utils";

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

  // NEW: onboarding SMS opt-in
  smsConsentChecked: boolean;
  smsOptInLoading: boolean;
  smsOptInError: string | null;
  smsEnabledInOnboarding: boolean; // whether user enabled via the opt-in step
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

  smsConsentChecked: false,
  smsOptInLoading: false,
  smsOptInError: null,
  smsEnabledInOnboarding: false,
};

export default function OnboardingPage() {
  const router = useRouter();

  const [form, setForm] = useState<ClientProfileFormState>(initialFormState);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<InitialPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // NEW: store payload after saving profile so we can generate AFTER SMS opt-in screen
  const [savedProfileId, setSavedProfileId] = useState<string | null>(null);
  const [savedPayload, setSavedPayload] = useState<any>(null); // keeps your existing payload structure

  function updateField<K extends keyof ClientProfileFormState>(
    key: K,
    value: ClientProfileFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const steps = [
    // (same steps you already had) ...
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
      required: ["workSchedule", "estimatedSteps"] as (keyof ClientProfileFormState)[],
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
              onChange={(e) => updateField("preferredWorkoutTime", e.target.value)}
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
      description: "We’ll use this for coaching-related updates. (No marketing.)",
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
              I agree to receive automated or AI-driven calls/messages related to my coaching plan.
              I understand this is not medical advice.
            </span>
          </label>
        </div>
      ),
    },

    // NEW STEP: SMS opt-in happens BEFORE plan generation
    {
      id: "sms-opt-in",
      title: "Enable SMS coaching?",
      description:
        "Optional. Get automated check-ins and reminders (non-marketing) so we can log your progress automatically.",
      required: [] as (keyof ClientProfileFormState)[],
      content: (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium text-slate-900">Automated SMS from Motivo</p>
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-600 space-y-1">
              <li>Purpose: workout reminders + check-in questions + coaching replies (no marketing).</li>
              <li>Frequency: <b>2–4 messages/day</b>.</li>
              <li>Reply <b>STOP</b> to unsubscribe. Reply <b>HELP</b> for help.</li>
              <li>Msg & data rates may apply.</li>
            </ul>
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              checked={form.smsConsentChecked}
              onChange={(e) => updateField("smsConsentChecked", e.target.checked)}
            />
            <span>
              I consent to receive automated SMS coaching from Motivo at the phone number I provided.
            </span>
          </label>

          {form.smsOptInError && (
            <p className="text-xs text-rose-500">{form.smsOptInError}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              onClick={() => {
                // Skip SMS; proceed to generate
                void handleGeneratePlan();
              }}
              disabled={loading || form.smsOptInLoading}
            >
              Skip for now
            </button>

            <button
              type="button"
              className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
              onClick={() => void handleEnableSmsAndGenerate()}
              disabled={loading || form.smsOptInLoading}
            >
              {form.smsOptInLoading ? "Enabling…" : "Enable SMS + generate plan"}
            </button>
          </div>

          <p className="text-[11px] text-slate-500">
            You can change this anytime in Settings.
          </p>
        </div>
      ),
    },
  ];

  const totalSteps = steps.length;
  const progress =
    totalSteps > 1 ? Math.round((currentStep / (totalSteps - 1)) * 100) : 100;

  const isLastStep = currentStep === totalSteps - 1;
  const step = steps[currentStep];

  function validateCurrentStep(): boolean {
    const stepDef = steps[currentStep];
    for (const key of stepDef.required) {
      const value = form[key];
      if (value === "" || value === null || value === undefined) {
        setError("Please complete this step before continuing.");
        return false;
      }
    }
    setError(null);
    return true;
  }

  async function handleSaveProfileOnly() {
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

    const normalizedSmsPhone = normalizePhoneNumberToE164(form.phoneNumber);

    // Important change:
    // - We store sms_phone_number (normalized) if valid
    // - BUT we do NOT enable sms flags here (consent happens on next screen)
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

      sms_phone_number: normalizedSmsPhone ?? null,
      allow_sms_checkins: false,         // ✅ consent not granted yet
      timezone: null,
    };

    const tdee = DailyCalorieNeeds(
      clientProfileBase.weight_kg,
      clientProfileBase.height_cm,
      clientProfileBase.age,
      clientProfileBase.gender,
      clientProfileBase.realisticWorkoutsPerWeek
    );

    let calorieTarget = tdee;
    if (clientProfileBase.goalType === "lose_weight") calorieTarget = tdee * 0.8;
    else if (clientProfileBase.goalType === "gain_muscle") calorieTarget = tdee * 1.1;
    else calorieTarget = tdee * 0.95;

    calorieTarget = Math.round(calorieTarget / 50) * 50;

    const macroTargets = { calorieTarget: Math.round(calorieTarget) };

    const clientProfileForDb = {
      ...clientProfileBase,
      calorie_target: macroTargets.calorieTarget,
    };

    const callAnswers = {
      why: "To stay in top shape for the job i am in.",
      futureVision: "In 6–12 months I want to feel leaner, stronger, and more energetic.",
      pastStruggles: "Time manageent and diet consistency have been my biggest challenges.",
      planRealismRating: 8,
      notes: "Looking forward to getting started and committed to making a change this time!",
    };

    try {
      const inserted = await saveClientProfile(clientProfileForDb as any, user.id);
      const profileId = inserted.id as string;
      setSavedProfileId(profileId);

      // Save payload for the next step (generate later)
      setSavedPayload({
        clientProfile: clientProfileForDb,
        callAnswers,
        macroTargets,
        profileId,
      });

      // Move to SMS opt-in step
      setCurrentStep((s) => s + 1);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnableSmsAndGenerate() {
    setForm((p) => ({ ...p, smsOptInError: null, smsOptInLoading: true }));

    try {
      if (!savedProfileId || !savedPayload) {
        throw new Error("Missing saved profile. Please go back and try again.");
      }

      if (!form.smsConsentChecked) {
        throw new Error("Please check the consent box to enable SMS.");
      }

      const normalized = normalizePhoneNumberToE164(form.phoneNumber);
      if (!normalized) {
        throw new Error("Your phone number looks invalid. Please go back and fix it.");
      }

      const res = await fetch("/api/sms/opt-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: savedProfileId,
          phone: normalized,
          consentChecked: true,
          source: "onboarding",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to enable SMS.");
      }

      setForm((p) => ({ ...p, smsEnabledInOnboarding: true }));

      await handleGeneratePlan();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to enable SMS.";
      setForm((p) => ({ ...p, smsOptInError: msg }));
    } finally {
      setForm((p) => ({ ...p, smsOptInLoading: false }));
    }
  }

  async function handleGeneratePlan() {
    setLoading(true);
    setError(null);
    setPlan(null);

    try {
      if (!savedPayload?.profileId) {
        throw new Error("Missing profile payload. Please go back and try again.");
      }

      const res = await fetch("/api/generate-initial-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savedPayload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Request failed");
      }

      const data = (await res.json()) as InitialPlanResponse;
      setPlan(data);

      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleNext() {
    if (!validateCurrentStep()) return;

    // If the current step is contact, we save profile then move to SMS opt-in
    if (steps[currentStep].id === "contact") {
      void handleSaveProfileOnly();
      return;
    }

    // The SMS step has its own buttons; don’t auto-advance.
    if (steps[currentStep].id === "sms-opt-in") return;

    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    }
  }

  function handleBack() {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setError(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
              <span className="text-sm font-bold">AI</span>
            </div>
            <div className="leading-tight">
              <a className="text-base font-semibold tracking-tight text-slate-900" href="/">
                Motivo
              </a>
              <p className="text-[11px] text-slate-500">Onboarding • Build your first plan</p>
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

      <div className="mx-auto max-w-4xl px-4 pt-8 pb-10 md:pt-10 md:pb-12">
        <div className="w-full max-w-xl mx-auto">
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

          <div className="w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
            <h2 className="text-lg font-semibold text-slate-900">{step.title}</h2>
            <p className="mt-1 text-xs text-slate-500">{step.description}</p>

            <div className="mt-4 space-y-4">{step.content}</div>

            {error && <p className="mt-3 text-xs text-rose-500">{error}</p>}

            {/* Buttons */}
            <div
              className={
                "mt-6 flex items-center " +
                (step.id === "sms-opt-in" ? "justify-end" : currentStep === 0 ? "justify-end" : "justify-between")
              }
            >
              {step.id !== "sms-opt-in" && currentStep > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="rounded-full px-4 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Back
                </button>
              )}

              {step.id !== "sms-opt-in" && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={loading}
                  className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  {loading ? "Saving..." : isLastStep ? "Next" : "Next"}
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-500">
            Motivo is a coaching tool, not a medical service. For any medical concerns or conditions,
            consult a healthcare professional.
          </p>
        </div>
      </div>
    </main>
  );
}
