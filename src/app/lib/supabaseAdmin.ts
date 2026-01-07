// import { createClient } from "@supabase/supabase-js";

// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

// lib/supabaseAdmin.ts
import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // service role (server only!)
  {
    auth: {
      persistSession: false,
    },
  }
);
