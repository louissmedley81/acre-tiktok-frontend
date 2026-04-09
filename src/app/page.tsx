import { AcreExperience } from "@/components/acre-experience";
import { getBackendBaseUrl, getSupabasePublicEnv } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

type InitialUser = {
  email: string | null;
  id: string;
} | null;

export default async function Home() {
  const { configured } = getSupabasePublicEnv();
  let initialUser: InitialUser = null;

  if (configured) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        initialUser = {
          email: user.email ?? null,
          id: user.id,
        };
      }
    } catch {
      initialUser = null;
    }
  }

  return (
    <AcreExperience
      backendBaseUrl={getBackendBaseUrl()}
      initialUser={initialUser}
      supabaseReady={configured}
    />
  );
}
