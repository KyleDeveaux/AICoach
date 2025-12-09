import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="max-w-xl text-center space-y-4">
        <h1 className="text-3xl font-bold">AI Fitness Coach</h1>
        <p className="text-gray-500">
          Weekly check-ins, daily accountability, and personalized workouts.
        </p>
        <div className="flex gap-4 justify-center mt-4">
          <Link
            href="/login"
            className="px-4 py-2 rounded bg-black text-white"
          >
            Get Started
          </Link>

          <Link
            href="/dashboard"
            className="px-4 py-2 rounded border border-gray-300"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
