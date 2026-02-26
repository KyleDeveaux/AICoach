"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { ClientProfile, FoodEntryRow, FoodEntryInsert } from "../lib/types";
import { supabase } from "../lib/supabaseClient";
import { getTodayLocalDate } from "../lib/utils";

import DashboardNav from "../dashboard/DashboardNav";
import MacroProgressSection from "./MacroProgressSection";
import MealLoggingCard from "./MealLoggingCard";
import HealthyRecipeSearch from "./HealthyRecipeSearch";

function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
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

export default function FoodPage() {
  const router = useRouter();
  const todayIso = getTodayLocalDate();

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [todayMeals, setTodayMeals] = useState<FoodEntryRow[]>([]);
  const [mealSaving, setMealSaving] = useState(false);
  const [mealDeletingId, setMealDeletingId] = useState<string | null>(null);

  // Load profile and today's meals
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Error getting user:", userError);
          return;
        }
        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("client_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (error) {
          console.error("Error loading client profile:", error);
          return;
        }

        if (cancelled) return;

        const clientProfile = data as ClientProfile;
        setProfile(clientProfile);

        // Load today's meals
        const { data: mealsData, error: mealsError } = await supabase
          .from("food_entries")
          .select("*")
          .eq("profile_id", clientProfile.id)
          .eq("entry_date", todayIso)
          .order("created_at", { ascending: true });

        if (mealsError) {
          console.error("Error loading food entries:", mealsError);
        } else if (mealsData) {
          setTodayMeals(mealsData as FoodEntryRow[]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();

    return () => {
      cancelled = true;
    };
  }, [router, todayIso]);

  // Calculate logged macros from meals
  const caloriesLogged = todayMeals.reduce(
    (sum, meal) => sum + (meal.calories ?? 0),
    0
  );
  const proteinLogged = todayMeals.reduce(
    (sum, meal) => sum + (meal.protein_g ?? 0),
    0
  );
  const carbsLogged = todayMeals.reduce(
    (sum, meal) => sum + (meal.carbs_g ?? 0),
    0
  );
  const fatLogged = todayMeals.reduce(
    (sum, meal) => sum + (meal.fat_g ?? 0),
    0
  );

  // Get targets from profile
  const calorieTarget = profile?.calorie_target ?? 0;
  const proteinTarget = profile?.protein_target ?? 0;
  const carbsTarget = profile?.carbs_target ?? 0;
  const fatTarget = profile?.fat_target ?? 0;

  // Add meal handler
  async function handleAddMeal(meal: {
    description: string;
    calories: number;
    meal_type: string;
    protein_g: number | null;
    carbs_g: number | null;
    fat_g: number | null;
  }) {
    if (!profile?.id) {
      throw new Error("Profile not loaded yet.");
    }

    const payload: FoodEntryInsert = {
      profile_id: profile.id,
      entry_date: todayIso,
      description: meal.description,
      calories: meal.calories,
      meal_type: meal.meal_type || null,
      protein_g: meal.protein_g,
      carbs_g: meal.carbs_g,
      fat_g: meal.fat_g,
    };

    setMealSaving(true);
    try {
      const { data, error } = await supabase
        .from("food_entries")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      setTodayMeals((prev) => [...prev, data as FoodEntryRow]);
    } finally {
      setMealSaving(false);
    }
  }

  // Delete meal handler
  async function handleDeleteMeal(id: string) {
    if (!profile?.id) return;
    setMealDeletingId(id);
    try {
      const { error } = await supabase
        .from("food_entries")
        .delete()
        .eq("id", id)
        .eq("profile_id", profile.id);

      if (error) throw error;

      setTodayMeals((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setMealDeletingId(null);
    }
  }

  // Loading state
  if (isLoading) {
    return (
      <main className="relative min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Spinner size={32} className="text-cyan-400" />
            <p className="text-sm text-slate-400">Loading nutrition...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen bg-slate-950 text-white">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />
        <div className="absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="absolute bottom-20 right-1/4 h-80 w-80 rounded-full bg-cyan-600/10 blur-3xl" />
      </div>

      <div className="relative z-10">
        <DashboardNav profile={profile} variant="dark" />

        <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 md:py-10">
          {/* Page header */}
          <div>
            <h1 className="text-2xl font-bold text-white">Nutrition</h1>
            <p className="mt-1 text-sm text-slate-400">
              Track your meals and macros to stay on target
            </p>
          </div>

          {/* Macro Progress Circles */}
          <MacroProgressSection
            proteinCurrent={proteinLogged}
            proteinTarget={proteinTarget}
            carbsCurrent={carbsLogged}
            carbsTarget={carbsTarget}
            fatCurrent={fatLogged}
            fatTarget={fatTarget}
            caloriesLogged={caloriesLogged}
            calorieTarget={calorieTarget}
          />

          {/* Meal Logging */}
          <MealLoggingCard
            todayMeals={todayMeals}
            onAddMeal={handleAddMeal}
            onDeleteMeal={handleDeleteMeal}
            isLoading={mealSaving}
            mealDeletingId={mealDeletingId}
          />

          {/* Healthy Recipe Search */}
          <HealthyRecipeSearch />
        </div>
      </div>
    </main>
  );
}
