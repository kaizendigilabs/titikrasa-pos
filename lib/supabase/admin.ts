import { createClient } from "@supabase/supabase-js";
import { Database } from "@/lib/types/database";

/**
 * Admin client with service role key for admin operations
 * Use this ONLY for server-side admin operations like:
 * - Creating users
 * - Deleting users
 * - Resetting passwords
 * DO NOT use this for regular user operations
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
