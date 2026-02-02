"use client";

import { useRouter } from "next/navigation";

type BodyCheckCardProps = {
  lastCheckDate: string | null;
  latestPhotoUrl: string | null;
};

export default function BodyCheckCard({ lastCheckDate, latestPhotoUrl }: BodyCheckCardProps) {
  const router = useRouter();

  const formattedDate = lastCheckDate
    ? new Date(lastCheckDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="glass-card p-5 transition-all duration-200">
      <h3 className="text-base font-bold text-white">Body Check</h3>

      {/* Photo area */}
      <div className="mt-3 overflow-hidden rounded-xl">
        {latestPhotoUrl ? (
          <div
            className="h-20 w-full bg-cover bg-center"
            style={{
              backgroundImage: `url('${latestPhotoUrl}')`,
              filter: "blur(4px)",
              transform: "scale(1.15)",
            }}
          />
        ) : (
          <div className="flex h-20 w-full items-center justify-center bg-slate-800/50">
            <div className="flex flex-col items-center gap-1.5">
              <svg className="h-6 w-6 text-slate-600" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] font-medium text-slate-600">No photos yet</span>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Last: <span className="font-bold text-slate-400">{formattedDate ?? "No checks yet"}</span>
      </p>

      <div className="mt-4 space-y-2">
        <button
          type="button"
          onClick={() => router.push("/body-check")}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:from-purple-500 hover:via-blue-500 hover:to-cyan-500"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Upload Progress Photo
        </button>

        <button
          type="button"
          onClick={() => router.push("/body-check")}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/5 bg-slate-800/50 px-4 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-slate-700/50"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          View Timeline
        </button>
      </div>
    </div>
  );
}
