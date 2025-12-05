// app/api/test-env/route.ts
import { NextResponse } from "next/server";

export async function GET() {
  const hasKey = !!process.env.OPENAI_API_KEY;
  return NextResponse.json({ hasKey });
}