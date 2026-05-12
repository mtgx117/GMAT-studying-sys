import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type SupabaseServerConfig =
  | {
      ok: true;
      client: SupabaseClient;
    }
  | {
      ok: false;
      missing: Array<"SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY">;
    };

export function getSupabaseServerClient(): SupabaseServerConfig {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const missing: Array<"SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"> = [];

  if (!supabaseUrl) {
    missing.push("SUPABASE_URL");
  }

  if (!serviceRoleKey) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length > 0) {
    return { ok: false, missing };
  }

  return {
    ok: true,
    client: createClient(supabaseUrl!, serviceRoleKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }),
  };
}
