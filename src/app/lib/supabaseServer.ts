// src/app/lib/supabaseServer.ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  // In some Next versions, cookies() is async. This makes it safe either way.
  const cookieStore = await Promise.resolve(cookies());

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Supabase SSR expects getAll/setAll
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // If this is called from a Server Component (readonly cookies), ignore.
            // Route handlers can set cookies, server components cannot.
          }
        },
      },
    }
  );
}
