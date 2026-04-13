import { AcreExperience } from "@/components/acre-experience";
import { getBackendBaseUrl, getSupabasePublicEnv } from "@/lib/env";
import { redirect } from "next/navigation";

type HomeProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function getSearchParamValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const code = getSearchParamValue(params?.code);

  if (code) {
    const requestedNext = getSearchParamValue(params?.next) ?? "/";
    const next = requestedNext.startsWith("/") ? requestedNext : "/";

    redirect(
      `/auth/client-callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`,
    );
  }

  const { configured } = getSupabasePublicEnv();

  return (
    <AcreExperience
      backendBaseUrl={getBackendBaseUrl()}
      initialUser={null}
      supabaseReady={configured}
    />
  );
}
