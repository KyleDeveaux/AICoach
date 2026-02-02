"use client";

import { useRouter } from "next/navigation";

type CoachingCardProps = {
  smsActive: boolean;
};

export default function CoachingCard({ smsActive }: CoachingCardProps) {
  const router = useRouter();

  // Hardcoded sample data
  const messagesSent = 2;
  const messagesLimit = 4;
  const nextCheckinTime = "7:30 PM";

  return (
    <div className="glass-card p-5 transition-all duration-200">
      <h3 className="text-base font-bold text-white">Coaching</h3>

      <div className="mt-3 space-y-3">
        {/* SMS Status */}
        <div className="flex items-center gap-2">
          <div className={[
            "flex h-6 w-6 items-center justify-center rounded-full",
            smsActive ? "bg-cyan-500/20" : "bg-slate-800/50",
          ].join(" ")}>
            <svg className={["h-3.5 w-3.5", smsActive ? "text-cyan-400" : "text-slate-500"].join(" ")} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span className="text-sm font-medium text-slate-400">
            SMS Support {smsActive ? "Active" : "Inactive"}
          </span>
        </div>

        {/* Stats */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-slate-400">
              {messagesSent} of {messagesLimit} messages sent
            </span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="h-3.5 w-3.5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-slate-400">
              Next check-in: {nextCheckinTime}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => router.push("/settings")}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-3 py-2 text-xs font-bold text-white transition-all duration-200 hover:from-blue-500 hover:to-cyan-500"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Manage
        </button>

        <button
          type="button"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-white/5 bg-slate-800/50 px-3 py-2 text-xs font-bold text-white transition-all duration-200 hover:bg-slate-700/50"
        >
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Send Test
        </button>
      </div>
    </div>
  );
}
