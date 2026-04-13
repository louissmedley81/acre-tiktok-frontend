"use client";

import { useEffect } from "react";

type Provider = "tiktok" | "x";

function getProvider(value: string | null): Provider | null {
  return value === "tiktok" || value === "x" ? value : null;
}

export default function SocialCallbackPage() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const provider = getProvider(url.searchParams.get("provider"));

    const target = provider ? `/?${provider}=connected` : "/";

    const timeout = window.setTimeout(() => {
      window.location.replace(target);
    }, 900);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

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
          Channel Connected
        </p>
        <h1 style={{ fontSize: "36px", margin: "0 0 12px" }}>
          Finishing channel setup
        </h1>
        <p style={{ color: "rgba(232,238,248,0.72)", lineHeight: 1.7, margin: 0 }}>
          We are confirming the connection and taking you back to ACRE.
        </p>
      </section>
    </main>
  );
}
