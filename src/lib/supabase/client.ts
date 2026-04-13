import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { requireSupabasePublicEnv } from "@/lib/env";

let browserClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createClient() {
  const { publishableKey, url } = requireSupabasePublicEnv();

  if (!browserClient) {
    browserClient = createSupabaseClient(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        persistSession: true,
      },
    });
  }

  return browserClient;
}
