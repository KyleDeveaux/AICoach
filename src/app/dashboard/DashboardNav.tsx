"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import type { ClientProfile } from "../lib/types";

type DashboardNavProps = {
  profile: ClientProfile | null;
};

export default function DashboardNav({ profile }: DashboardNavProps) {
  const router = useRouter();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      router.push("/login");
    } catch (err) {
      console.error("Error logging out:", err);
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:py-4">
        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm">
            <span className="text-sm font-bold">AI</span>
          </div>
          <div className="flex flex-col leading-tight">
            <a
              className="text-base font-semibold tracking-tight md:text-lg"
              href="/"
            >
              Coach<span className="text-blue-600">IE</span>
            </a>
            <span className="text-xs text-slate-500">
              Your AI trainer & nutrition coach
            </span>
          </div>
        </div>

        {/* Right side: user info + settings */}
        {profile && (
          <div className="relative flex items-center gap-2 text-sm text-slate-600">
            <span className="hidden text-xs uppercase tracking-wide text-slate-400 md:inline">
              Logged in as
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800">
              {profile.first_name} {profile.last_name}
            </span>

            {/* Settings button */}
            <button
              type="button"
              onClick={() => setIsSettingsOpen((prev) => !prev)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              aria-label="Open settings"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.78 1.78 0 0 0 .37 1.95l.06.06a1.5 1.5 0 0 1-2.12 2.12l-.06-.06A1.78 1.78 0 0 0 15 19.4a1.78 1.78 0 0 0-1 .6 1.78 1.78 0 0 0-.37 1.95l.03.07a1.5 1.5 0 1 1-2.8 0l.03-.07A1.78 1.78 0 0 0 9 19.4a1.78 1.78 0 0 0-1.95.37l-.06.06a1.5 1.5 0 1 1-2.12-2.12l.06-.06A1.78 1.78 0 0 0 4.6 15a1.78 1.78 0 0 0-1.95-1l-.07.03a1.5 1.5 0 0 1 0-2.8l.07.03A1.78 1.78 0 0 0 4.6 9a1.78 1.78 0 0 0-.6-1 1.78 1.78 0 0 0-1.95-.37l-.07.03a1.5 1.5 0 1 1 2.8 0l-.03.07A1.78 1.78 0 0 0 9 4.6a1.78 1.78 0 0 0 1-.6 1.78 1.78 0 0 0 .37-1.95l-.03-.07a1.5 1.5 0 1 1 2.8 0l.03.07A1.78 1.78 0 0 0 15 4.6a1.78 1.78 0 0 0 1.95-.37l.06-.06a1.5 1.5 0 1 1 2.12 2.12l-.06.06A1.78 1.78 0 0 0 19.4 9c.35.94.35 2.06 0 3z" />
              </svg>
            </button>

            {/* Settings dropdown */}
            {isSettingsOpen && (
              <div className="absolute right-0 top-10 w-52 rounded-xl border border-slate-200 bg-white shadow-lg shadow-slate-200/80">
                <div className="border-b border-slate-100 px-3 py-2">
                  <p className="text-xs font-semibold text-slate-700">
                    Account menu
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Manage your CoachIE account
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    router.push("/settings");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  <span>Account settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    router.push("/billing");
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span>Billing & payments</span>
                </button>

                <div className="border-t border-slate-100" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-600 hover:bg-rose-50"
                >
                  <span>Log out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
