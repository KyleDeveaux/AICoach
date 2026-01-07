// app/api/body-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const runtime = "nodejs";

// Server-side Supabase client (service role)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { persistSession: false },
  }
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

type BodyCheckAnalysis = {
  summary: string;
  focusAreas?: string[];
  updatedPlanNotes?: string;
};

function stripFences(text: string) {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const cleaned = value
    .filter((v) => typeof v === "string")
    .map((s) => s.trim())
    .filter(Boolean);
  return cleaned.length ? cleaned : undefined;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("photo");
    const profileId = formData.get("profileId");

    if (!profileId || typeof profileId !== "string") {
      return NextResponse.json(
        { error: "Missing profileId in form data." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Photo file is required." },
        { status: 400 }
      );
    }

    // ----- 1) Read file bytes + upload image to Supabase storage -----
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `body-check-${Date.now()}.jpg`;
    const imagePath = fileName; // exact path used everywhere

    console.log("[body-check] Uploading to:", {
      bucket: "body-checks",
      imagePath,
      contentType: file.type || "image/jpeg",
    });

    const { error: uploadError } = await supabaseAdmin.storage
      .from("body-checks")
      .upload(imagePath, buffer, {
        contentType: file.type || "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading body-check image:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image." },
        { status: 500 }
      );
    }

    // ----- 2) Call vision model -----
    const base64Image = buffer.toString("base64");
    const dataUrl = `data:${file.type || "image/jpeg"};base64,${base64Image}`;

    // ✅ Make it more coach-like (less robotic), but still STRICT JSON
    const systemPrompt = `
You are CoachIE — a supportive, confident physique coach.

Given a single progress photo:
1) Give a short coach-style summary (2–4 sentences).
2) Identify 2–4 specific focus areas to prioritize next (be concrete).
3) Give plan notes that could guide future workouts (tone: coach, not robotic).

Return STRICTLY JSON only (no markdown, no code fences) in this exact shape:

{
  "summary": "string",
  "focusAreas": ["string"],
  "updatedPlanNotes": "string"
}

Rules:
- Do not mention “AI”, “model”, or “JSON”.
- No medical advice.
`.trim();

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: systemPrompt },
            { type: "input_image", image_url: dataUrl, detail: "high" },
          ],
        },
      ],
    });

    let rawText = "";
    const firstOutput = response.output?.[0];
    if (firstOutput?.type === "message") {
      const firstContent = firstOutput.content?.[0];
      if (firstContent?.type === "output_text") {
        rawText = firstContent.text;
      }
    }

    if (!rawText) {
      console.error("No text output from vision model:", response);
      return NextResponse.json(
        { error: "No analysis returned from model." },
        { status: 500 }
      );
    }

    const cleaned = stripFences(rawText);

    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(cleaned);
    } catch (err) {
      console.error("Failed to parse analysis JSON:", err, cleaned);
      return NextResponse.json(
        { error: "Model returned invalid JSON." },
        { status: 500 }
      );
    }

    // ✅ Hard-validate shape so we never store garbage
    const parsedObj = parsedUnknown as Record<string, unknown>;

    const summary =
      typeof parsedObj.summary === "string" ? parsedObj.summary.trim() : "";

    if (!summary) {
      return NextResponse.json(
        { error: "Model returned empty summary." },
        { status: 500 }
      );
    }

    const focusAreas = normalizeStringArray(parsedObj.focusAreas);
    const updatedPlanNotes =
      typeof parsedObj.updatedPlanNotes === "string"
        ? parsedObj.updatedPlanNotes.trim()
        : undefined;

    const parsed: BodyCheckAnalysis = {
      summary,
      ...(focusAreas ? { focusAreas } : {}),
      ...(updatedPlanNotes ? { updatedPlanNotes } : {}),
    };

    // ----- 3) Persist record in body_checks -----
    const nowIso = new Date().toISOString();

    const { error: insertError } = await supabaseAdmin
      .from("body_checks")
      .insert({
        profile_id: profileId,
        image_path: imagePath,
        summary: parsed.summary,
        focus_areas: parsed.focusAreas ?? null,
        plan_notes: parsed.updatedPlanNotes ?? null,
        raw_analysis: parsed,
        created_at: nowIso,
      });

    if (insertError) {
      console.error("Error inserting body_checks row:", insertError);
      // Still continue, since the user should still get the analysis response.
    }

    // ✅ ----- 4) STEP 2: Update "active focus context" on the profile -----
    // This is what lets weekly review keep generating workouts using the latest body-check focus.
    const { error: focusUpdateError } = await supabaseAdmin
      .from("client_profiles")
      .update({
        active_focus_areas: parsed.focusAreas ?? null,
        active_plan_notes: parsed.updatedPlanNotes ?? null,
        active_focus_updated_at: nowIso,
        // active_focus_source: "body_check", // if you add this optional column
      })
      .eq("id", profileId);

    if (focusUpdateError) {
      console.error(
        "Error updating client_profiles active focus context:",
        focusUpdateError
      );
      // Still return analysis; this should not break UX
    }

    return NextResponse.json({ analysis: parsed });
  } catch (err) {
    console.error("Error in /api/body-check:", err);
    return NextResponse.json(
      { error: "Failed to analyze photo." },
      { status: 500 }
    );
  }
}
