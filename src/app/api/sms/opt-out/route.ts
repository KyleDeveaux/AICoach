// app/api/sms/opt-out/route.ts
// Handles opt-out from settings page (not STOP keyword - that's handled in webhook)

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) return jsonError("Unauthorized", 401);

    const body = await req.json().catch(() => null);
    const profileId = body?.profileId as string | undefined;

    if (!profileId || typeof profileId !== "string") {
      return jsonError("Missing profileId");
    }

    // Verify profile belongs to logged-in user
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("id, user_id")
      .eq("id", profileId)
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      console.error("opt-out: profile lookup failed:", profileError?.message);
      return jsonError("Profile not found", 404);
    }

    const nowIso = new Date().toISOString();

    // Update sms_subscriptions to stopped
    const { error: subError } = await supabaseAdmin
      .from("sms_subscriptions")
      .update({
        status: "stopped",
        opted_out_at: nowIso,
        updated_at: nowIso,
      })
      .eq("profile_id", profileId);

    if (subError) {
      // Not fatal - subscription may not exist
      console.warn("opt-out: update subscription failed:", subError.message);
    }

    // Also update client_profiles flags
    const { error: profileUpdateError } = await supabaseAdmin
      .from("client_profiles")
      .update({
        sms_checkins_enabled: false,
        allow_sms_checkins: false,
      })
      .eq("id", profileId);

    if (profileUpdateError) {
      console.error("opt-out: update profile failed:", profileUpdateError.message);
      return jsonError("Failed to disable SMS", 500);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("opt-out route error:", err);
    return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
  }
}
