"use client";

import { useEffect, useState } from "react";

type Provider = "tiktok" | "x";

type CallbackStatus = "checking" | "confirmed" | "error";

const backendBaseUrl = (
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://acre-tiktok-backend-main.vercel.app"
).replace(/\/+$/, "");

const providerConfig: Record<
  Provider,
  {
    endpoint: string;
    label: string;
    target: string;
  }
> = {
  tiktok: {
    endpoint: "/api/tiktok-me",
    label: "TikTok",
    target: "/?tiktok=connected",
  },
  x: {
    endpoint: "/api/auth/x-me",
    label: "X",
    target: "/?x=connected",
  },
};

function getProvider(value: string | null): Provider | null {
  return value === "tiktok" || value === "x" ? value : null;
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export default function SocialCallbackPage() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [attempt, setAttempt] = useState(1);
  const [status, setStatus] = useState<CallbackStatus>("checking");

  useEffect(() => {
    let cancelled = false;
    const url = new URL(window.location.href);
    const nextProvider = getProvider(url.searchParams.get("provider"));

    if (!nextProvider) {
      window.location.replace("/");
      return;
    }

    const config = providerConfig[nextProvider];

    async function confirmConnection() {
      let nextAttempt = 1;

      setProvider(nextProvider);

      while (!cancelled) {
        setAttempt(nextAttempt);

        try {
          const response = await fetch(`${backendBaseUrl}${config.endpoint}`, {
            credentials: "include",
          });

          if (response.ok) {
            setStatus("confirmed");
            await wait(500);

            if (!cancelled) {
              window.location.replace(config.target);
            }

            return;
          }
        } catch {
          // Keep waiting here. The dashboard can only be reliable after the
          // backend confirms the freshly issued OAuth cookies are usable.
        }

        nextAttempt += 1;

        if (nextAttempt > 45) {
          setStatus("error");
          return;
        }

        await wait(1000);
      }
    }

    void confirmConnection();

    return () => {
      cancelled = true;
    };
  }, []);

  const label = provider ? providerConfig[provider].label : "channel";
  const isError = status === "error";
  const isConfirmed = status === "confirmed";

  return (
    <main
      style={{
        display: "grid",
        minHeight: "100vh",
        padding: "32px",
        placeItems: "center",
      }}
    >
      <section
        style={{
          background: "rgba(17, 21, 31, 0.92)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          maxWidth: "560px",
          padding: "32px",
          width: "100%",
        }}
      >
        <p
          style={{
            color: "#8eff6b",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "12px",
            letterSpacing: "0.22em",
            margin: "0 0 12px",
            textTransform: "uppercase",
          }}
        >
          {isError ? "Still Checking" : "Channel Connected"}
        </p>
        <h1 style={{ fontSize: "36px", margin: "0 0 12px" }}>
          {isConfirmed
            ? `${label} is connected`
            : isError
              ? `${label} needs one more check`
              : `Finishing ${label} setup`}
        </h1>
        <p style={{ color: "rgba(232,238,248,0.72)", lineHeight: 1.7, margin: 0 }}>
          {isConfirmed
            ? "We confirmed the connection and are taking you back to ACRE."
            : isError
              ? "The connection may still be completing. You can keep this page open, try again, or continue back to the dashboard."
              : `We are waiting for ${label} tokens to become available before loading your dashboard. Check ${attempt}/45.`}
        </p>
        {isError ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "24px" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#8eff6b",
                border: 0,
                borderRadius: "999px",
                color: "#081108",
                cursor: "pointer",
                fontWeight: 700,
                padding: "12px 18px",
              }}
              type="button"
            >
              Check again
            </button>
            <button
              onClick={() => window.location.replace(provider ? providerConfig[provider].target : "/")}
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: "999px",
                color: "#e8eef8",
                cursor: "pointer",
                fontWeight: 700,
                padding: "12px 18px",
              }}
              type="button"
            >
              Continue to dashboard
            </button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
