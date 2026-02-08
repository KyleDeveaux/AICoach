// app/settings/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import type { ClientProfile } from "../lib/types";
import DashboardNav from "../dashboard/DashboardNav";

function normalizePhoneNumberToE164(raw: string): string | null {
  // Very basic US-centric normalizer for now.
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // If they already typed something starting with +, assume it's intentional
  if (trimmed.startsWith("+") && digits.length >= 8) {
    return `+${digits}`;
  }

  // 10 digits → assume US and prefix +1
  if (digits.length === 10) {
    return `+1${digits}`;
  }

  // 11 digits starting with 1 → +1XXXXXXXXXX
  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  // If nothing matches, return null so we can show an error
  return null;
}

export default function SettingsPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [allowSmsCheckins, setAllowSmsCheckins] = useState(false);

  // ─────────────────────────────
  // Derived: DB vs UI state
  // ─────────────────────────────
  const effectiveDbPhone =
    profile?.phone_number ?? profile?.sms_phone_number ?? "";

  const effectiveDbAllow = profile
    ? (profile.sms_checkins_enabled ??
       profile.allow_sms_checkins ??
       false)
    : false;

  const isDirty =
    !!profile &&
    (phoneNumber.trim() !== effectiveDbPhone.trim() ||
      allowSmsCheckins !== effectiveDbAllow);

  const canSendTest =
    !!profile &&
    !!profile.sms_phone_number &&
    !!(profile.sms_checkins_enabled ?? profile.allow_sms_checkins) &&
    !isDirty &&
    !sendingTest;

  // ─────────────────────────────
  // Test SMS
  // ─────────────────────────────
  async function handleSendTestSms() {
    if (!profile || !canSendTest) return;

    setSendingTest(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/dev/send-test-checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: profile.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to send test SMS.");
      }

      setSuccess("Test SMS sent! Check your phone in a moment.");
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Failed to send test SMS.";
      setError(msg);
    } finally {
      setSendingTest(false);
    }
  }

  // ─────────────────────────────
  // Load profile on mount
  // ─────────────────────────────
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

      setPhoneNumber(
        clientProfile.phone_number ?? clientProfile.sms_phone_number ?? ""
      );

      const smsEnabled =
        clientProfile.sms_checkins_enabled ??
        clientProfile.allow_sms_checkins ??
        false;

      setAllowSmsCheckins(!!smsEnabled);

      setLoading(false);
    }

    loadProfile();
  }, [router]);

  // ─────────────────────────────
  // Save
  // ─────────────────────────────
  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const rawPhone = phoneNumber.trim() || null;
    const normalizedSmsPhone = rawPhone
      ? normalizePhoneNumberToE164(rawPhone)
      : null;

    // If user tries to turn on SMS but number is invalid → stop & show error
    if (allowSmsCheckins && !normalizedSmsPhone) {
      setError(
        "To enable SMS check-ins, please enter a valid phone number with country code (e.g. +1 555 123 4567)."
      );
      setSaving(false);
      return;
    }

    const smsEnabled = allowSmsCheckins && !!normalizedSmsPhone;
    const wasEnabled = effectiveDbAllow;
    const isEnabling = smsEnabled && !wasEnabled;
    const isDisabling = !smsEnabled && wasEnabled;

    try {
      // If ENABLING SMS → call /api/sms/opt-in to create sms_subscriptions row + send welcome
      if (isEnabling) {
        const optInRes = await fetch("/api/sms/opt-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profileId: profile.id,
            phone: normalizedSmsPhone,
            consentChecked: true,
            source: "settings",
          }),
        });

        if (!optInRes.ok) {
          const data = await optInRes.json().catch(() => ({}));
          throw new Error(data.error || "Failed to enable SMS.");
        }

        // opt-in route already updates client_profiles, so just reload
        const { data: refreshed, error: refreshErr } = await supabase
          .from("client_profiles")
          .select("*")
          .eq("id", profile.id)
          .single();

        if (refreshErr || !refreshed) {
          throw new Error("Failed to refresh profile after enabling SMS.");
        }

        const updated = refreshed as ClientProfile;
        setProfile(updated);
        setPhoneNumber(
          updated.phone_number ?? updated.sms_phone_number ?? rawPhone ?? ""
        );
        setAllowSmsCheckins(
          !!(updated.sms_checkins_enabled ?? updated.allow_sms_checkins)
        );
        setSuccess("SMS check-ins enabled! You should receive a welcome text.");
        return;
      }

      // If DISABLING SMS → update client_profiles AND sms_subscriptions
      if (isDisabling) {
        // Update client_profiles
        const { error: updateError } = await supabase
          .from("client_profiles")
          .update({
            phone_number: rawPhone,
            sms_phone_number: normalizedSmsPhone,
            sms_checkins_enabled: false,
            allow_sms_checkins: false,
          })
          .eq("id", profile.id);

        if (updateError) {
          console.error("Error disabling SMS in profile:", updateError);
          throw updateError;
        }

        // Update sms_subscriptions via API to mark as stopped
        const disableRes = await fetch("/api/sms/opt-out", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profileId: profile.id }),
        });

        // Don't fail if opt-out API doesn't exist or fails (subscription might not exist)
        if (!disableRes.ok) {
          console.warn("SMS opt-out API call failed (subscription may not exist)");
        }

        const { data: refreshed } = await supabase
          .from("client_profiles")
          .select("*")
          .eq("id", profile.id)
          .single();

        if (refreshed) {
          const updated = refreshed as ClientProfile;
          setProfile(updated);
          setPhoneNumber(
            updated.phone_number ?? updated.sms_phone_number ?? rawPhone ?? ""
          );
          setAllowSmsCheckins(false);
        }

        setSuccess("SMS check-ins disabled.");
        return;
      }

      // If just updating phone number (SMS state unchanged)
      const { data, error: updateError } = await supabase
        .from("client_profiles")
        .update({
          phone_number: rawPhone,
          sms_phone_number: normalizedSmsPhone,
          sms_checkins_enabled: smsEnabled,
          allow_sms_checkins: smsEnabled,
        })
        .eq("id", profile.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating SMS settings:", updateError);
        throw updateError;
      }

      const updated = data as ClientProfile;
      setProfile(updated);
      setPhoneNumber(
        updated.phone_number ?? updated.sms_phone_number ?? rawPhone ?? ""
      );
      setAllowSmsCheckins(
        !!(updated.sms_checkins_enabled ?? updated.allow_sms_checkins)
      );

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

  // ─────────────────────────────
  // UI
  // ─────────────────────────────
  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <DashboardNav profile={profile} />
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
                      your workout and calories, then update your daily check-in
                      log automatically.
                    </p>
                    {allowSmsCheckins && !phoneNumber && (
                      <p className="mt-1 text-[11px] text-amber-600">
                        Add your phone number above to receive SMS check-ins.
                      </p>
                    )}
                    {isDirty && (
                      <p className="mt-1 text-[11px] text-slate-500">
                        You’ve changed your SMS settings. Don’t forget to save
                        before sending a test.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setAllowSmsCheckins((prev) => !prev)}
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

                {error && <p className="text-xs text-rose-500">{error}</p>}
                {success && (
                  <p className="text-xs text-emerald-600">{success}</p>
                )}

                <div className="mt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={handleSendTestSms}
                    disabled={!canSendTest}
                    className="rounded-full border border-blue-600 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingTest ? "Sending…" : "Send me a test SMS"}
                  </button>

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
