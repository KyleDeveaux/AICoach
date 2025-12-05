// app/dashboard/page.tsx
"use client";

import Link from "next/link";

export default function DashboardPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Here you&apos;ll see your weekly plan and today&apos;s workout.</p>
      <div className="mt-4 px-4 py-2 rounded bg-blue-500 text-white inline-block">
        <Link href="/">Back To Homepage</Link>
      </div>
    </main>
  );
}
