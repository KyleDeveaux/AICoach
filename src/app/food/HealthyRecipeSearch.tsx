"use client";

import { useState, useMemo } from "react";

export default function HealthyRecipeSearch() {
  const [searchTerm, setSearchTerm] = useState("");

  const youtubeUrl = useMemo(
    () =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(
        `healthy ${searchTerm} recipe`
      )}`,
    [searchTerm]
  );

  const googleUrl = useMemo(
    () =>
      `https://www.google.com/search?q=${encodeURIComponent(
        `healthy ${searchTerm} recipe`
      )}`,
    [searchTerm]
  );

  const canSearch = searchTerm.trim().length > 0;

  return (
    <div className="glass-card p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600">
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Find Healthy Recipes</h3>
          <p className="text-xs text-slate-500">
            Craving something? Search for a healthy version
          </p>
        </div>
      </div>

      <div className="mt-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="e.g. pizza, tacos, ice cream, pasta..."
          className="w-full rounded-lg border border-white/[0.06] bg-slate-800/50 px-4 py-3 text-sm font-medium text-white placeholder-slate-600 outline-none transition-all focus:border-white/10"
        />
      </div>

      {canSearch && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <a
            href={youtubeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-red-500"
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
            YouTube
          </a>
          <a
            href={googleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-slate-800/50 px-4 py-3 text-sm font-bold text-white transition-all hover:bg-slate-700/50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Google
          </a>
        </div>
      )}
    </div>
  );
}
