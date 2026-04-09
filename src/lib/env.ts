const fallbackBackendUrl = "https://acre-tiktok-backend-main.vercel.app";

export function getSupabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  return {
    configured: Boolean(url && publishableKey),
    publishableKey,
    url,
  };
}

export function requireSupabasePublicEnv() {
  const { configured, publishableKey, url } = getSupabasePublicEnv();

  if (!configured || !url || !publishableKey) {
    throw new Error(
      "Missing Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  return { publishableKey, url };
}

export function getBackendBaseUrl() {
  return (process.env.NEXT_PUBLIC_BACKEND_URL || fallbackBackendUrl).replace(
    /\/+$/,
    "",
  );
}
