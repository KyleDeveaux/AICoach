// app/onboarding/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../lib/supabaseClient";
import type { InitialPlanResponse, SubscriptionTier, BillingInterval } from "../lib/types";
import { saveClientProfile } from "../lib/saveClientProfile";
import { DailyCalorieNeeds, calculateMacros } from "../lib/macros";
import { normalizePhoneNumberToE164 } from "../lib/utils";
import { PRICING_TIERS } from "../lib/pricingData";

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

  // NEW: photo upload
  photoFile: File | null;
  photoPreviewUrl: string | null;
  photoAnalysis: {
    summary: string;
    focusAreas?: string[];
    updatedPlanNotes?: string;
  } | null;
  photoAnalysisLoading: boolean;
  photoAnalysisError: string | null;

  // SMS opt-in
  smsConsentChecked: boolean;
  smsOptInLoading: boolean;
  smsOptInError: string | null;
  smsEnabledInOnboarding: boolean;
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

  photoFile: null,
  photoPreviewUrl: null,
  photoAnalysis: null,
  photoAnalysisLoading: false,
  photoAnalysisError: null,

  smsConsentChecked: false,
  smsOptInLoading: false,
  smsOptInError: null,
  smsEnabledInOnboarding: false,
};

// Image compression helper
async function compressImage(
  file: File,
  maxWidth = 900,
  maxHeight = 900,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        let { width, height } = img;
        const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
        width = width * ratio;
        height = height * ratio;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(objectUrl);
          return reject(new Error("Failed to get canvas context"));
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (!blob) {
              return reject(new Error("Failed to create compressed image"));
            }
            const compressedFile = new File([blob], "body-check.jpg", {
              type: "image/jpeg",
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(err);
    };

    img.src = objectUrl;
  });
}

function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        fill="none"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const [form, setForm] = useState<ClientProfileFormState>(initialFormState);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<InitialPlanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [savedProfileId, setSavedProfileId] = useState<string | null>(null);
  const [savedPayload, setSavedPayload] = useState<any>(null);
  const [showUpsell, setShowUpsell] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<SubscriptionTier | null>(null);

  function updateField<K extends keyof ClientProfileFormState>(
    key: K,
    value: ClientProfileFormState[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handlePhotoAnalysis() {
    if (!form.photoFile) {
      setForm((p) => ({ ...p, photoAnalysisError: "Please select a photo first" }));
      return;
    }

    setForm((p) => ({
      ...p,
      photoAnalysisLoading: true,
      photoAnalysisError: null,
      photoAnalysis: null,
    }));

    try {
      const compressed = await compressImage(form.photoFile);

      if (compressed.size > 900 * 1024) {
        throw new Error("Photo is too large after compression. Try a smaller image.");
      }

      const formData = new FormData();
      formData.append("photo", compressed);

      const res = await fetch("/api/body-check", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to analyze photo");
      }

      const data = await res.json();
      setForm((p) => ({ ...p, photoAnalysis: data.analysis }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to analyze photo";
      setForm((p) => ({ ...p, photoAnalysisError: message }));
    } finally {
      setForm((p) => ({ ...p, photoAnalysisLoading: false }));
    }
  }

  const steps = [
    {
      id: "name",
      title: "Let's start with your name",
      description: "Your coach will use this to speak to you personally.",
      required: ["first_name", "last_name"] as (keyof ClientProfileFormState)[],
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              First name *
            </label>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
              value={form.first_name}
              onChange={(e) => updateField("first_name", e.target.value)}
              placeholder="John"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Last name *
            </label>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
              value={form.last_name}
              onChange={(e) => updateField("last_name", e.target.value)}
              placeholder="Doe"
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
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Age *
            </label>
            <input
              type="number"
              min={16}
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
              value={form.age}
              onChange={(e) => updateField("age", e.target.value)}
              placeholder="25"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Gender
            </label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
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
      description: "We'll use this to calculate a starting plan.",
      required: [
        "height_feet",
        "height_inches",
        "weight_lbs",
        "goalWeight_lbs",
      ] as (keyof ClientProfileFormState)[],
      content: (
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Height *
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min={3}
                max={7}
                placeholder="ft"
                className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
                value={form.height_feet}
                onChange={(e) => updateField("height_feet", e.target.value)}
              />
              <input
                type="number"
                min={0}
                max={11}
                placeholder="in"
                className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
                value={form.height_inches}
                onChange={(e) => updateField("height_inches", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Current weight (lbs) *
            </label>
            <input
              type="number"
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
              value={form.weight_lbs}
              onChange={(e) => updateField("weight_lbs", e.target.value)}
              placeholder="180"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Goal weight (lbs) *
            </label>
            <input
              type="number"
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
              value={form.goalWeight_lbs}
              onChange={(e) => updateField("goalWeight_lbs", e.target.value)}
              placeholder="165"
            />
          </div>
        </div>
      ),
    },
    {
      id: "goal-equipment",
      title: "Goal & equipment",
      description:
        "We'll match your training split to your goal and what you have access to.",
      required: ["goalType", "equipment"] as (keyof ClientProfileFormState)[],
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Main goal *
            </label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
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
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Equipment access *
            </label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
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
        "We'd rather give you 3 days you can stick to than 6 you can't.",
      required: [
        "currentWorkoutsPerWeek",
        "realisticWorkoutsPerWeek",
      ] as (keyof ClientProfileFormState)[],
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Currently working out (days/week) *
            </label>
            <input
              type="number"
              min={0}
              max={7}
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
              value={form.currentWorkoutsPerWeek}
              onChange={(e) =>
                updateField("currentWorkoutsPerWeek", e.target.value)
              }
              placeholder="3"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Realistically can commit to (days/week) *
            </label>
            <input
              type="number"
              min={1}
              max={7}
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
              value={form.realisticWorkoutsPerWeek}
              onChange={(e) =>
                updateField("realisticWorkoutsPerWeek", e.target.value)
              }
              placeholder="4"
            />
          </div>
        </div>
      ),
    },
    {
      id: "schedule-steps",
      title: "Your schedule & daily movement",
      description: "We'll align your step and workout targets with real life.",
      required: ["workSchedule", "estimatedSteps"] as (keyof ClientProfileFormState)[],
      content: (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Work schedule (e.g. Mon–Fri 9–5)
            </label>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
              placeholder="Mon–Fri 9–5"
              value={form.workSchedule}
              onChange={(e) => updateField("workSchedule", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Preferred workout time
            </label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
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
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Estimated steps per day
            </label>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
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
      description: "We'll use this for coaching-related updates. (No marketing.)",
      required: ["email", "phoneNumber"] as (keyof ClientProfileFormState)[],
      content: (
        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Email *
            </label>
            <input
              type="email"
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Phone number *
            </label>
            <input
              type="tel"
              className="w-full rounded-xl border border-white/10 bg-slate-800/50 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none backdrop-blur transition focus:border-purple-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20"
              placeholder="(555) 123-4567"
              value={form.phoneNumber}
              onChange={(e) => updateField("phoneNumber", e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-purple-600 focus:ring-purple-500"
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

    // NEW STEP: Optional Photo Upload
    {
      id: "photo-upload",
      title: "Upload a progress photo (optional)",
      description:
        "Get AI analysis of your starting point to personalize your plan even further. You can skip this and add photos later.",
      required: [] as (keyof ClientProfileFormState)[],
      content: (
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-blue-500/10 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">📸</span>
              <div>
                <p className="text-sm font-semibold text-white">Why upload a photo?</p>
                <p className="mt-1 text-xs text-slate-400">
                  Our AI will analyze your physique and identify specific focus areas to prioritize
                  in your training plan. This helps us build a more personalized starting point.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-300">
              Choose photo
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <label
                className={[
                  "inline-flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-800/50 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-purple-500 hover:bg-slate-800",
                  form.photoAnalysisLoading ? "pointer-events-none opacity-50" : "",
                ].join(" ")}
              >
                <span>Choose or take photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (file) {
                      const url = URL.createObjectURL(file);
                      setForm((p) => ({
                        ...p,
                        photoFile: file,
                        photoPreviewUrl: url,
                        photoAnalysis: null,
                        photoAnalysisError: null,
                      }));
                    }
                  }}
                  disabled={form.photoAnalysisLoading}
                />
              </label>

              {form.photoFile && !form.photoAnalysis && (
                <>
                  <button
                    type="button"
                    onClick={handlePhotoAnalysis}
                    disabled={form.photoAnalysisLoading}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:shadow-purple-500/50 disabled:opacity-50"
                  >
                    {form.photoAnalysisLoading && <Spinner size={14} />}
                    <span>{form.photoAnalysisLoading ? "Analyzing..." : "Analyze photo"}</span>
                  </button>
                  {!form.photoAnalysisLoading && (
                    <button
                      type="button"
                      onClick={() => {
                        setForm((p) => ({
                          ...p,
                          photoFile: null,
                          photoPreviewUrl: null,
                          photoAnalysis: null,
                          photoAnalysisError: null,
                        }));
                      }}
                      className="rounded-xl border border-slate-600 px-4 py-3 text-sm font-medium text-slate-400 transition hover:border-slate-500 hover:text-slate-300"
                    >
                      Remove photo
                    </button>
                  )}
                </>
              )}
            </div>

            {form.photoFile && (
              <p className="mt-2 text-xs text-slate-500">
                Selected: <span className="font-medium text-slate-300">{form.photoFile.name}</span>
              </p>
            )}
          </div>

          {form.photoPreviewUrl && (
            <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-800/30">
              <img
                src={form.photoPreviewUrl}
                alt="Preview"
                className="max-h-80 w-full object-contain"
              />
            </div>
          )}

          {form.photoAnalysisError && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{form.photoAnalysisError}</p>
            </div>
          )}

          {form.photoAnalysis && (
            <div className="space-y-3 rounded-xl border border-green-500/20 bg-green-500/10 p-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">✓</span>
                <p className="text-sm font-semibold text-green-300">Analysis complete!</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Summary
                </p>
                <p className="mt-1 text-sm text-slate-300">{form.photoAnalysis.summary}</p>
              </div>

              {form.photoAnalysis.focusAreas && form.photoAnalysis.focusAreas.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Focus areas for your plan
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-sm text-slate-300">
                    {form.photoAnalysis.focusAreas.map((area, i) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <p className="text-xs text-slate-500">
            You can always add or update photos later in the Body Check section of your dashboard.
          </p>
        </div>
      ),
    },

    // SMS opt-in step
    {
      id: "sms-opt-in",
      title: "Enable SMS coaching?",
      description:
        "Optional. Get automated check-ins and reminders (non-marketing) so we can log your progress automatically.",
      required: [] as (keyof ClientProfileFormState)[],
      content: (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-slate-800/30 p-4 text-sm text-slate-300">
            <p className="font-semibold text-white">Automated SMS from Motivo</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
              <li>Purpose: workout reminders + check-in questions + coaching replies (no marketing).</li>
              <li>Frequency: <b>2–4 messages/day</b>.</li>
              <li>Reply <b>STOP</b> to unsubscribe. Reply <b>HELP</b> for help.</li>
              <li>Msg & data rates may apply.</li>
            </ul>
          </div>

          <label className="flex items-start gap-2 text-xs text-slate-300">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-purple-600 focus:ring-purple-500"
              checked={form.smsConsentChecked}
              onChange={(e) => updateField("smsConsentChecked", e.target.checked)}
            />
            <span>
              I consent to receive automated SMS coaching from Motivo at the phone number I provided.
            </span>
          </label>

          {form.smsOptInError && (
            <p className="text-xs text-red-400">{form.smsOptInError}</p>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="rounded-full border border-slate-600 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              onClick={() => {
                void handleGeneratePlan();
              }}
              disabled={loading || form.smsOptInLoading}
            >
              Skip for now
            </button>

            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50"
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
      allow_sms_checkins: false,
      timezone: null,

      // Include photo analysis if available
      active_focus_areas: form.photoAnalysis?.focusAreas ?? null,
      active_plan_notes: form.photoAnalysis?.updatedPlanNotes ?? null,
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

    // Calculate full macro targets based on calories, weight, and goal
    const macroTargets = calculateMacros(
      Math.round(calorieTarget),
      clientProfileBase.weight_kg,
      clientProfileBase.goalType
    );

    const clientProfileForDb = {
      ...clientProfileBase,
      calorie_target: macroTargets.calorieTarget,
      protein_target: macroTargets.proteinTarget,
      carbs_target: macroTargets.carbsTarget,
      fat_target: macroTargets.fatTarget,
    };

    const callAnswers = {
      why: "To stay in top shape for the job i am in.",
      futureVision: "In 6–12 months I want to feel leaner, stronger, and more energetic.",
      pastStruggles: "Time management and diet consistency have been my biggest challenges.",
      planRealismRating: 8,
      notes: "Looking forward to getting started and committed to making a change this time!",
      // Include photo analysis summary if available
      photoAnalysisSummary: form.photoAnalysis?.summary ?? null,
    };

    try {
      const inserted = await saveClientProfile(clientProfileForDb as any, user.id);
      const profileId = inserted.id as string;
      setSavedProfileId(profileId);

      setSavedPayload({
        clientProfile: clientProfileForDb,
        callAnswers,
        macroTargets,
        profileId,
      });

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

      // Show upsell step instead of immediately redirecting
      setShowUpsell(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleStartTrial(tier: Exclude<SubscriptionTier, "free">, interval: BillingInterval = "month") {
    setCheckoutLoading(tier);
    try {
      // Build success/cancel URLs that route to dashboard after checkout
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/dashboard?welcome=true&subscribed=${tier}`;
      const cancelUrl = `${baseUrl}/onboarding?canceled=true`;

      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, interval, successUrl, cancelUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to start checkout");
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      setError(err instanceof Error ? err.message : "Failed to start trial");
    } finally {
      setCheckoutLoading(null);
    }
  }

  function handleContinueFree() {
    router.push("/dashboard");
  }

  function handleNext() {
    if (!validateCurrentStep()) return;

    if (steps[currentStep].id === "contact") {
      void handleSaveProfileOnly();
      return;
    }

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

  // Upsell screen after plan generation
  if (showUpsell) {
    const proTier = PRICING_TIERS.find((t) => t.id === "pro")!;
    const eliteTier = PRICING_TIERS.find((t) => t.id === "elite")!;

    return (
      <main className="min-h-screen bg-slate-950 text-slate-50">
        {/* Animated background gradients */}
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
          <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute bottom-20 right-1/4 h-80 w-80 rounded-full bg-cyan-600/20 blur-3xl" />
        </div>

        <header className="relative z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex max-w-4xl items-center justify-center px-6 py-4">
            <Link href="/" className="group flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 opacity-75 blur-md transition group-hover:opacity-100" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 shadow-lg">
                  <span className="text-base font-black text-white">M</span>
                </div>
              </div>
              <div>
                <h1 className="text-lg font-black tracking-tight">
                  Moti<span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">vo</span>
                </h1>
              </div>
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto max-w-4xl px-6 pb-12 pt-8 md:pt-12">
          {/* Success message */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-green-500/30">
              <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white md:text-3xl">Your plan is ready, {form.first_name}!</h2>
            <p className="mt-2 text-slate-400">
              Your personalized workout and nutrition plan has been created.
            </p>
          </div>

          {/* Upsell section */}
          <div className="mb-6 text-center">
            <h3 className="text-xl font-bold text-white">Unlock the full Motivo experience</h3>
            <p className="mt-2 text-sm text-slate-400">
              Get AI coaching, SMS check-ins, and more with a 7-day free trial.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Pro Card */}
            <div className="relative rounded-2xl border border-purple-500/30 bg-gradient-to-b from-purple-500/10 to-slate-900/50 p-6">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-1 text-xs font-bold text-white">
                  Most Popular
                </span>
              </div>

              <div className="mt-2">
                <h4 className="text-lg font-bold text-white">{proTier.name}</h4>
                <p className="mt-1 text-sm text-slate-400">{proTier.description}</p>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">${proTier.monthlyPrice}</span>
                <span className="text-slate-500">/month</span>
              </div>

              <ul className="mt-4 space-y-2">
                {proTier.features.slice(0, 5).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleStartTrial("pro")}
                disabled={checkoutLoading !== null}
                className="mt-6 w-full rounded-xl bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 py-3 text-sm font-bold text-white shadow-lg transition hover:shadow-purple-500/30 disabled:opacity-50"
              >
                {checkoutLoading === "pro" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size={14} />
                    Processing...
                  </span>
                ) : (
                  "Start 7-Day Free Trial"
                )}
              </button>
            </div>

            {/* Elite Card */}
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="mt-2">
                <h4 className="text-lg font-bold text-white">{eliteTier.name}</h4>
                <p className="mt-1 text-sm text-slate-400">{eliteTier.description}</p>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">${eliteTier.monthlyPrice}</span>
                <span className="text-slate-500">/month</span>
              </div>

              <ul className="mt-4 space-y-2">
                {eliteTier.features.slice(0, 5).map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-slate-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleStartTrial("elite")}
                disabled={checkoutLoading !== null}
                className="mt-6 w-full rounded-xl border border-white/20 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                {checkoutLoading === "elite" ? (
                  <span className="flex items-center justify-center gap-2">
                    <Spinner size={14} />
                    Processing...
                  </span>
                ) : (
                  "Start 7-Day Free Trial"
                )}
              </button>
            </div>
          </div>

          {/* Continue free option */}
          <div className="mt-8 text-center">
            <button
              onClick={handleContinueFree}
              disabled={checkoutLoading !== null}
              className="text-sm text-slate-400 underline-offset-4 hover:text-white hover:underline disabled:opacity-50"
            >
              Continue with Free plan
            </button>
            <p className="mt-2 text-xs text-slate-500">
              You can upgrade anytime from your dashboard.
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-center">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      {/* Animated background gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-600/20 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-80 w-80 rounded-full bg-cyan-600/20 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" className="group flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 opacity-75 blur-md transition group-hover:opacity-100" />
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 shadow-lg">
                <span className="text-base font-black text-white">M</span>
              </div>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">
                Moti<span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">vo</span>
              </h1>
              <p className="text-[10px] font-medium text-slate-500">Onboarding • Build your plan</p>
            </div>
          </Link>

          <div className="hidden text-right text-xs text-slate-500 sm:block">
            <p className="font-semibold text-slate-300">
              Step {currentStep + 1} of {totalSteps}
            </p>
            <p className="text-[11px]">About 3–4 minutes</p>
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-2xl px-6 pb-12 pt-8 md:pt-10">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
            <span>Onboarding progress</span>
            <span className="font-semibold text-slate-400">{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800/50 backdrop-blur">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-6 shadow-2xl backdrop-blur-xl md:p-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-cyan-500/5" />

          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-white">{step.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{step.description}</p>

            <div className="mt-6">{step.content}</div>

            {error && (
              <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div
              className={
                "mt-8 flex items-center " +
                (step.id === "sms-opt-in" ? "justify-end" : currentStep === 0 ? "justify-end" : "justify-between")
              }
            >
              {step.id !== "sms-opt-in" && currentStep > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="rounded-full border border-slate-600 px-5 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Back
                </button>
              )}

              {step.id !== "sms-opt-in" && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={
                    loading ||
                    // Disable Next when photo is uploaded but not yet analyzed
                    (step.id === "photo-upload" && !!form.photoFile && !form.photoAnalysis)
                  }
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-purple-500/30 transition hover:shadow-purple-500/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading && <Spinner size={14} />}
                  <span>{loading ? "Saving..." : "Next"}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-600">
          Motivo is a coaching tool, not a medical service. For any medical concerns or conditions,
          consult a healthcare professional.
        </p>
      </div>
    </main>
  );
}
