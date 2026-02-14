"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabaseClient";
import type { ClientProfile } from "../lib/types";
import Link from "next/link";

const navItems = [
  {
    href: "/dashboard",
    label: "Today",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    href: "/workout",
    label: "Workout",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
  {
    href: "/food",
    label: "Food",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
      </svg>
    ),
  },
  {
    href: "/progress",
    label: "Progress",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Coach",
    icon: (
      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
];

type DashboardNavProps = {
  profile: ClientProfile | null;
  variant?: "dark" | "light";
};

export default function DashboardNav({ profile, variant = "dark" }: DashboardNavProps) {
  const pathname = usePathname();
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

  useEffect(() => {
    if (!isSettingsOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-settings-menu]")) {
        setIsSettingsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isSettingsOpen]);

  const isDark = variant === "dark";

  return (
    <header
      className={[
        "sticky top-0 z-20 border-b backdrop-blur-sm",
        isDark
          ? "border-white/5 bg-slate-950/80"
          : "border-slate-200 bg-white/95",
      ].join(" ")}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 shadow-lg">
            <span className="text-sm font-bold text-white">M</span>
          </div>
          <a
            className={[
              "text-base font-bold transition-colors md:text-lg",
              isDark ? "text-white hover:text-white/80" : "text-slate-900 hover:text-slate-600",
            ].join(" ")}
            href="/dashboard"
          >
            Motivo
          </a>
        </div>

        {/* Tab Navigation */}
        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname?.startsWith(item.href) ?? false;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={[
                  "flex items-center gap-2 px-3 py-2 text-sm font-medium transition-all duration-200",
                  isActive
                    ? isDark
                      ? "text-white"
                      : "text-slate-900"
                    : isDark
                      ? "text-slate-500 hover:text-white/80"
                      : "text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: notification bell + user avatar */}
        <div className="flex items-center gap-3">
          {/* Notification bell (placeholder) */}
          <button
            type="button"
            className={[
              "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
              isDark
                ? "text-slate-400 hover:bg-white/5 hover:text-white"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-700",
            ].join(" ")}
            aria-label="Notifications"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* User avatar + dropdown */}
          {profile && (
            <div className="relative" data-settings-menu>
              <button
                type="button"
                onClick={() => setIsSettingsOpen((prev) => !prev)}
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-200",
                  isDark
                    ? "border-white/5 bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-white hover:border-white/20"
                    : "border-slate-200 bg-slate-100 text-slate-700 hover:border-slate-300",
                ].join(" ")}
                aria-label="User menu"
              >
                {profile.first_name?.[0]?.toUpperCase() ?? "U"}
              </button>

              {isSettingsOpen && (
                <div
                  className={[
                    "absolute right-0 top-12 w-52 overflow-hidden rounded-lg border shadow-lg",
                    isDark
                      ? "border-white/5 bg-slate-900"
                      : "border-slate-200 bg-white",
                  ].join(" ")}
                >
                  <div className={[
                    "border-b px-4 py-3",
                    isDark ? "border-white/5" : "border-slate-100",
                  ].join(" ")}>
                    <p className={["text-xs font-semibold", isDark ? "text-white" : "text-slate-900"].join(" ")}>
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className={["mt-0.5 text-xs", isDark ? "text-slate-500" : "text-slate-500"].join(" ")}>
                      Manage your account
                    </p>
                  </div>

                  <div className="p-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        router.push("/settings");
                      }}
                      className={[
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        isDark
                          ? "text-slate-400 hover:bg-white/5 hover:text-white"
                          : "text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Account settings
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSettingsOpen(false);
                        router.push("/billing");
                      }}
                      className={[
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        isDark
                          ? "text-slate-400 hover:bg-white/5 hover:text-white"
                          : "text-slate-700 hover:bg-slate-50",
                      ].join(" ")}
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      Billing
                    </button>
                  </div>

                  <div className={["border-t p-2", isDark ? "border-white/5" : "border-slate-100"].join(" ")}>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
