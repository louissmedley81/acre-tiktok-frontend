import { AcreExperience } from "@/components/acre-experience";
import { getBackendBaseUrl, getSupabasePublicEnv } from "@/lib/env";

export default function Home() {
  const { configured } = getSupabasePublicEnv();

  return (
    <AcreExperience
      backendBaseUrl={getBackendBaseUrl()}
      initialUser={null}
      supabaseReady={configured}
    />
  );
}
