import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Browser client (uses cookies set by middleware/server when applicable)
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
