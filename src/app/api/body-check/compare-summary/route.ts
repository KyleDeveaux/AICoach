// app/api/body-check/compare-summary/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/app/lib/supabaseServer";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type CompareEntryInput = {
  createdAt: string; // ISO date string
  summary?: string | null;
  focusAreas?: string[] | null;
  planNotes?: string | null;
};

type CompareSummaryRequestBody = {
  left: CompareEntryInput;
  right: CompareEntryInput;
};

function stripFences(text: string) {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const t = Date.parse(value);
  return Number.isFinite(t);
}

function normalizeAreas(areas: string[] | null | undefined) {
  return (areas ?? [])
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
}

function fallbackCompareSummary(left: CompareEntryInput, right: CompareEntryInput) {
  // deterministic "good enough" fallback if model parsing fails
  const leftAreas = normalizeAreas(left.focusAreas);
  const rightAreas = normalizeAreas(right.focusAreas);

  const leftSet = new Set(leftAreas.map((x) => x.toLowerCase()));
  const rightSet = new Set(rightAreas.map((x) => x.toLowerCase()));

  const shared = rightAreas.filter((x) => leftSet.has(x.toLowerCase()));
  const newlyAdded = rightAreas.filter((x) => !leftSet.has(x.toLowerCase()));
  const deEmphasized = leftAreas.filter((x) => !rightSet.has(x.toLowerCase()));

  const leftDate = new Date(left.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const rightDate = new Date(right.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const lines: string[] = [];
  lines.push(`From ${leftDate} → ${rightDate}: here’s what changed.`);
  if (shared.length) lines.push(`Consistent focus: ${shared.join(", ")}.`);
  if (newlyAdded.length) lines.push(`New emphasis: ${newlyAdded.join(", ")}.`);
  if (deEmphasized.length) lines.push(`Less emphasis now: ${deEmphasized.join(", ")}.`);
  lines.push(`This week: keep 1–2 priorities, push them hard, and keep the rest steady.`);
  return lines.join(" ");
}

export async function POST(req: NextRequest) {
  try {
    // ✅ Auth: must be logged in
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Partial<CompareSummaryRequestBody>;

    if (!body?.left || !body?.right) {
      return NextResponse.json(
        { error: "Missing required body: { left, right }" },
        { status: 400 }
      );
    }

    const left = body.left;
    const right = body.right;

    if (!isValidIsoDate(left.createdAt) || !isValidIsoDate(right.createdAt)) {
      return NextResponse.json(
        { error: "left.createdAt and right.createdAt must be valid ISO date strings." },
        { status: 400 }
      );
    }

    // Put them in chronological order so the coach summary reads naturally
    const leftTime = Date.parse(left.createdAt);
    const rightTime = Date.parse(right.createdAt);

    const older = leftTime <= rightTime ? left : right;
    const newer = leftTime <= rightTime ? right : left;

    const olderAreas = normalizeAreas(older.focusAreas);
    const newerAreas = normalizeAreas(newer.focusAreas);

    const olderPlan = older.planNotes ?? "";
    const newerPlan = newer.planNotes ?? "";

    const olderSummary = older.summary ?? "";
    const newerSummary = newer.summary ?? "";

    const prompt = `
You are CoachIE — a supportive, confident physique coach.

Task:
Given TWO body-check entries (older and newer), write a short comparison summary that feels like a real coach:
- Call out what looks improved or trending the right direction (based on notes provided).
- Call out what still needs focus.
- Mention how the focus areas changed (what stayed consistent, what’s newly emphasized).
- End with 1–2 concrete “this week” actions.

Output rules (VERY IMPORTANT):
Return STRICTLY JSON only (no markdown, no code fences), exactly:
{ "summary": "string" }

Style constraints:
- 3–6 sentences max.
- Human tone, not robotic.
- No medical claims, no disclaimers.
- Don’t mention “JSON” or “model” or “AI”.

OLDER ENTRY:
date: ${older.createdAt}
summary: ${olderSummary}
focusAreas: ${JSON.stringify(olderAreas)}
planNotes: ${olderPlan}

NEWER ENTRY:
date: ${newer.createdAt}
summary: ${newerSummary}
focusAreas: ${JSON.stringify(newerAreas)}
planNotes: ${newerPlan}
`.trim();

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
    });

    let rawText = "";
    const firstOutput = response.output?.[0];

    if (firstOutput?.type === "message") {
      const firstContent = firstOutput.content?.[0];
      if (firstContent?.type === "output_text") rawText = firstContent.text;
    }

    if (!rawText) {
      // Fall back so UI doesn't break
      return NextResponse.json({
        summary: fallbackCompareSummary(older, newer),
        source: "fallback_no_model_text",
      });
    }

    const cleaned = stripFences(rawText);

    try {
      const parsed = JSON.parse(cleaned) as { summary?: unknown };

      if (typeof parsed.summary !== "string" || parsed.summary.trim().length === 0) {
        return NextResponse.json({
          summary: fallbackCompareSummary(older, newer),
          source: "fallback_bad_shape",
        });
      }

      // Optional: clamp length so it doesn't get too long in the UI
      const summary =
        parsed.summary.length > 900 ? parsed.summary.slice(0, 900).trim() : parsed.summary.trim();

      return NextResponse.json({ summary, source: "model" });
    } catch {
      return NextResponse.json({
        summary: fallbackCompareSummary(older, newer),
        source: "fallback_parse_error",
      });
    }
  } catch (err) {
    console.error("[compare-summary] error:", err);
    return NextResponse.json(
      { error: "Failed to generate compare summary." },
      { status: 500 }
    );
  }
}
