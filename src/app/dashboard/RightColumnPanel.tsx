"use client";

import React from "react";
import type { ClientProfile, WeeklySummaryResponse } from "../lib/types";

type RightColumnPanelProps = {
  weeklySummary: WeeklySummaryResponse | null;
  isGeneratingSummary: boolean;
  canGenerate: boolean;
  onGenerateWeeklySummary: () => void;
  profile: ClientProfile | null;
};

export default function RightColumnPanel({
  weeklySummary,
  isGeneratingSummary,
  canGenerate,
  onGenerateWeeklySummary,
  profile,
}: RightColumnPanelProps) {
  return (
    <section className="space-y-6">
      {/* This Week (LLM summary) */}
      <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold md:text-lg">This Week</h2>
          <button
            onClick={onGenerateWeeklySummary}
            disabled={isGeneratingSummary || !canGenerate}
            className="rounded-full bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isGeneratingSummary ? "Generating..." : "Generate summary"}
          </button>
        </div>

        {weeklySummary ? (
          <>
            <p className="mt-3 text-sm text-slate-700">
              {weeklySummary.summary}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="text-slate-500">Days logged</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {weeklySummary.adherence.totalDays}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="text-slate-500">Workouts</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {weeklySummary.adherence.daysWorkedOut}
                </p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
                <p className="text-slate-500">Calorie days</p>
                <p className="mt-1 text-base font-semibold text-slate-900">
                  {weeklySummary.adherence.daysHitCalories}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs">
              <p className="font-semibold text-blue-800">
                Calorie recommendation
              </p>
              <p className="mt-1 text-blue-800/90">
                {weeklySummary.calorieAdjustment.recommendation === "keep" &&
                  "Keep your current calories – let’s tighten habits first."}
                {weeklySummary.calorieAdjustment.recommendation ===
                  "lower_slightly" &&
                  "Slightly lower calories – your consistency is strong, and this can help restart progress."}
                {weeklySummary.calorieAdjustment.recommendation ===
                  "raise_slightly" &&
                  "Slightly raise calories – we may need better recovery and energy for your workouts."}
              </p>
              <p className="mt-1 text-[11px] text-blue-700/80">
                {weeklySummary.calorieAdjustment.explanation}
              </p>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-600">
            Once you log a few days, I&apos;ll break down your week here and
            suggest 1–2 simple improvements.
          </p>
        )}
      </div>

      {/* Latest coach message */}
      {weeklySummary && (
        <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
          <h2 className="text-base font-semibold md:text-lg">Your Coach</h2>
          <p className="mt-2 text-sm text-slate-700">
            {weeklySummary.accountabilityMessage}
          </p>
        </div>
      )}

      {/* Your Why */}
      <div className="rounded-2xl bg-white p-5 shadow-sm shadow-slate-200 md:p-6">
        <h2 className="text-base font-semibold md:text-lg">Your Why</h2>
        <p className="mt-2 text-sm text-slate-700">
          {profile?.goal_why ||
            "We’ll save your main reason for starting this journey here so we can remind you when things get tough."}
        </p>
        {profile?.past_struggles && (
          <p className="mt-3 text-xs text-slate-500">
            Things that usually knock you off track:{" "}
            <span className="font-medium text-slate-700">
              {profile.past_struggles}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
