"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";

type ClientProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  age: number;
  gender: string;
  height_cm: number;
  weight_kg: number;
  goal_type: string;
  goal_weight_kg: number;
  current_workouts_per_week: number;
  realistic_workouts_per_week: number;
  work_schedule: string | null;
  preferred_workout_time: string | null;
  equipment: string;
  estimated_steps: string | null;
  calorie_target: number | null;
};

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ClientProfileRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        // Not logged in → send to login
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error(error);
        setError("Could not load your profile yet.");
      } else {
        setProfile(data as ClientProfileRow);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <main className="p-6">
        <p>Loading your dashboard...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6 space-y-4">
        <p className="text-red-500 text-sm">{error}</p>
        <button
          onClick={() => router.push("/onboarding")}
          className="px-4 py-2 rounded bg-black text-white text-sm"
        >
          Go to onboarding
        </button>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="p-6 space-y-4">
        <p>No profile found yet.</p>
        <button
          onClick={() => router.push("/onboarding")}
          className="px-4 py-2 rounded bg-black text-white text-sm"
        >
          Complete onboarding
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Welcome back, {profile.first_name} 👋
          </h1>
          <p className="text-sm text-gray-600">
            This is your dashboard. We’ll later show your weekly plan,
            today&apos;s workout, and check-ins here.
          </p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="px-3 py-1 rounded border text-sm"
      >
        Log out
      </button>

      <section className="border rounded p-4 space-y-2 text-sm">
        <h2 className="font-semibold mb-2">Your profile</h2>
        <p>
          <strong>Goal:</strong> {profile.goal_type} → {profile.goal_weight_kg}{" "}
          kg
        </p>
        <p>
          <strong>Current weight:</strong> {profile.weight_kg} kg
        </p>
        <p>
          <strong>Height:</strong> {profile.height_cm} cm
        </p>
        <p>
          <strong>Workouts/week:</strong> {profile.realistic_workouts_per_week}
        </p>
        <p>
          <strong>Equipment:</strong> {profile.equipment}
        </p>
        {profile.calorie_target && (
          <p>
            <strong>Daily calories:</strong> {profile.calorie_target}
          </p>
        )}
      </section>
    </main>
  );
}
