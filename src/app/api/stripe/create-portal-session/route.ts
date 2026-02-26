// Create Stripe Customer Portal session for subscription management

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/app/lib/supabaseServer";
import { stripe } from "@/app/lib/stripe";

export const runtime = "nodejs";

interface CreatePortalRequest {
  returnUrl?: string;
}

export async function POST(req: Request) {
  try {
    // Authenticate user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request body
    const body = (await req.json().catch(() => ({}))) as CreatePortalRequest;
    const { returnUrl } = body;

    // Get user's profile with Stripe customer ID
    const { data: profile, error: profileError } = await supabase
      .from("client_profiles")
      .select("id, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found" },
        { status: 404 }
      );
    }

    if (!profile.stripe_customer_id) {
      return NextResponse.json(
        { error: "No subscription found. Please subscribe first." },
        { status: 400 }
      );
    }

    // Create portal session
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: returnUrl || `${baseUrl}/billing`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/create-portal-session] Error:", message);
    return NextResponse.json(
      { error: `Failed to create portal session: ${message}` },
      { status: 500 }
    );
  }
}
