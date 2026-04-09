import { createBrowserClient } from "@supabase/ssr";
import { requireSupabasePublicEnv } from "@/lib/env";

export function createClient() {
  const { publishableKey, url } = requireSupabasePublicEnv();

  return createBrowserClient(url, publishableKey);
}
