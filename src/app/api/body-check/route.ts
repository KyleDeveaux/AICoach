// src/app/api/body-check/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createSupabaseServerClient } from "@/app/lib/supabaseServer"; // <- your async helper
import { checkUsageLimit, incrementUsage } from "@/app/lib/featureGating";
import { supabaseAdmin } from "@/app/lib/supabaseAdmin";

export const runtime = "nodejs";

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

function pickContentType(file: File) {
  const type = (file.type || "").toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg") return "image/jpeg";
  if (type === "image/png") return "image/png";
  if (type === "image/webp") return "image/webp";
  return null;
}

function getTextFromResponsesAPI(response: any): string {
  // Robust extraction: collect any output_text chunks across messages
  try {
    const chunks: string[] = [];

    const outputs = response?.output ?? [];
    for (const out of outputs) {
      if (out?.type === "message") {
        const content = out?.content ?? [];
        for (const c of content) {
          if (c?.type === "output_text" && typeof c?.text === "string") {
            chunks.push(c.text);
          }
        }
      }
    }

    return chunks.join("\n").trim();
  } catch {
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    // ✅ RLS-enforced supabase client from cookies
    const supabase = await createSupabaseServerClient();

    // ✅ Auth: must be logged in
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("photo");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Photo file is required." }, { status: 400 });
    }

    // ✅ validate type + size
    const contentType = pickContentType(file);
    if (!contentType) {
      return NextResponse.json(
        { error: "Unsupported image type. Use JPG, PNG, or WEBP." },
        { status: 400 }
      );
    }

    const MAX_BYTES = 8 * 1024 * 1024; // 8MB
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Please upload a file under 8MB." },
        { status: 400 }
      );
    }

    // ✅ Derive profile from logged-in user (no profileId from client)
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile?.id) {
      console.error("[body-check] Could not load profile:", profileError);
      return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
    }

    const profileId = profile.id as string;

    // ✅ Feature gating: check if user can use AI photo analysis
    const usageCheck = await checkUsageLimit(profileId, "ai_photo_analyses", supabase);
    if (!usageCheck.allowed) {
      return NextResponse.json(
        {
          error: usageCheck.reason || "Usage limit reached",
          upgradeRequired: true,
          used: usageCheck.used,
          limit: usageCheck.limit,
        },
        { status: 403 }
      );
    }

    // ----- 1) Upload image to Supabase Storage (RLS enforced) -----
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Put under user folder to make storage policies easier
    const ext =
      contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";

    const imagePath = `${user.id}/body-check-${Date.now()}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("body-checks")
      .upload(imagePath, buffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      console.error("[body-check] Storage upload error:", uploadError);
      return NextResponse.json({ error: "Failed to upload image." }, { status: 500 });
    }

    // ----- 2) Call vision model -----
    const base64Image = buffer.toString("base64");
    const dataUrl = `data:${contentType};base64,${base64Image}`;

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

    const rawText = getTextFromResponsesAPI(response);

    if (!rawText) {
      console.error("[body-check] No model text output:", response);
      return NextResponse.json({ error: "No analysis returned from model." }, { status: 500 });
    }

    const cleaned = stripFences(rawText);

    let parsedUnknown: unknown;
    try {
      parsedUnknown = JSON.parse(cleaned);
    } catch (err) {
      console.error("[body-check] Invalid JSON from model:", err, cleaned);
      return NextResponse.json({ error: "Model returned invalid JSON." }, { status: 500 });
    }

    // ✅ Hard-validate shape
    const parsedObj = parsedUnknown as Record<string, unknown>;
    const summary = typeof parsedObj.summary === "string" ? parsedObj.summary.trim() : "";

    if (!summary) {
      return NextResponse.json({ error: "Model returned empty summary." }, { status: 500 });
    }

    const focusAreas = normalizeStringArray(parsedObj.focusAreas);
    const updatedPlanNotes =
      typeof parsedObj.updatedPlanNotes === "string"
        ? parsedObj.updatedPlanNotes.trim()
        : undefined;

    const analysis: BodyCheckAnalysis = {
      summary,
      ...(focusAreas ? { focusAreas } : {}),
      ...(updatedPlanNotes ? { updatedPlanNotes } : {}),
    };

    const nowIso = new Date().toISOString();

    // ----- 3) Insert body_check record (RLS enforced) -----
    const { error: insertError } = await supabase.from("body_checks").insert({
      profile_id: profileId,
      image_path: imagePath,
      summary: analysis.summary,
      focus_areas: analysis.focusAreas ?? null,
      plan_notes: analysis.updatedPlanNotes ?? null,
      raw_analysis: analysis, // jsonb
      created_at: nowIso, // optional if DB defaults exist
    });

    if (insertError) {
      console.error("[body-check] Insert body_checks error:", insertError);
      // don't block returning analysis to user
    }

    // ----- 4) Update active focus context on profile (RLS enforced) -----
    const { error: focusUpdateError } = await supabase
      .from("client_profiles")
      .update({
        active_focus_areas: analysis.focusAreas ?? null,
        active_plan_notes: analysis.updatedPlanNotes ?? null,
        active_focus_updated_at: nowIso,
      })
      .eq("id", profileId);

    if (focusUpdateError) {
      console.error("[body-check] Update profile focus error:", focusUpdateError);
      // still return analysis
    }

    // ✅ Increment usage counter after successful analysis
    await incrementUsage(profileId, "ai_photo_analyses", supabaseAdmin);

    return NextResponse.json({
      analysis,
      imagePath, // optional but useful for debugging/UI
    });
  } catch (err) {
    console.error("[body-check] Route error:", err);
    return NextResponse.json({ error: "Failed to analyze photo." }, { status: 500 });
  }
}
