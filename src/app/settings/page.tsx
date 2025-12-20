// app/settings/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import type { ClientProfile } from "../lib/types";

export default function SettingsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [allowSmsCheckins, setAllowSmsCheckins] = useState(false);

  // Load profile on mount
  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        setError("Could not load user.");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("You must be logged in to view settings.");
        setLoading(false);
        router.push("/login");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError || !data) {
        console.error("Error loading client profile:", profileError);
        setError("Could not load your profile.");
        setLoading(false);
        return;
      }

      const clientProfile = data as ClientProfile;
      setProfile(clientProfile);

      setPhoneNumber(clientProfile.phone_number ?? "");
      setAllowSmsCheckins(Boolean(clientProfile.allow_sms_checkins));

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  function normalizePhone(input: string) {
    const trimmed = input.trim();

    // Very light normalization: if user types 10 digits, treat as US and prefix +1.
    const digits = trimmed.replace(/\D/g, "");
    if (!digits) return "";

    if (trimmed.startsWith("+")) return trimmed; // assume they know what they’re doing

    if (digits.length === 10) {
      return `+1${digits}`;
    }

    // Fallback: just return trimmed as-is
    return trimmed;
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const normalizedPhone = phoneNumber ? normalizePhone(phoneNumber) : null;

    try {
      const { data, error: updateError } = await supabase
        .from("client_profiles")
        .update({
          phone_number: normalizedPhone,
          allow_sms_checkins: allowSmsCheckins,
        })
        .eq("id", profile.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating SMS settings:", updateError);
        throw updateError;
      }

      setProfile(data as ClientProfile);
      setSuccess("Settings saved.");
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Failed to save settings.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">

      <div className="mx-auto max-w-3xl px-4 py-6 md:py-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage how CoachIE contacts you and updates your plan.
        </p>

        <div className="mt-6 space-y-6">
          {/* SMS settings card */}
          <section className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
            <h2 className="text-base font-semibold text-slate-900">
              SMS check-ins
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              I can text you once a day to ask if you worked out and stayed
              close to your calories, then automatically log it in your
              dashboard.
            </p>

            {loading ? (
              <p className="mt-4 text-sm text-slate-500">Loading…</p>
            ) : (
              <form onSubmit={handleSave} className="mt-4 space-y-4">
                {/* Phone number */}
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Phone number
                    <span className="ml-1 text-[11px] font-normal text-slate-400">
                      Use full number with country code (e.g. +1…)
                    </span>
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                    placeholder="+1 555 123 4567"
                  />
                </div>

                {/* Allow SMS check-ins toggle */}
                <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      Allow SMS check-ins
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      When this is on, I’ll send you a daily text asking about
                      your workout and calories, then update your daily
                      check-in log automatically.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setAllowSmsCheckins((prev) => !prev)
                    }
                    className={[
                      "relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full border transition",
                      allowSmsCheckins
                        ? "border-blue-500 bg-blue-500"
                        : "border-slate-300 bg-slate-200",
                    ].join(" ")}
                    aria-pressed={allowSmsCheckins}
                  >
                    <span
                      className={[
                        "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
                        allowSmsCheckins ? "translate-x-5" : "translate-x-1",
                      ].join(" ")}
                    />
                  </button>
                </div>

                {error && (
                  <p className="text-xs text-rose-500">{error}</p>
                )}
                {success && (
                  <p className="text-xs text-emerald-600">{success}</p>
                )}

                <div className="mt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving || !profile}
                    className="rounded-full bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {saving ? "Saving…" : "Save settings"}
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
