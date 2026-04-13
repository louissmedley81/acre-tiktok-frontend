"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function getSafeNext(value: string | null) {
  return value?.startsWith("/") ? value : "/";
}

export default function ClientAuthCallbackPage() {
  const [message, setMessage] = useState("Completing Google sign-in...");

  useEffect(() => {
    let cancelled = false;

    async function completeSignIn() {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      const next = getSafeNext(url.searchParams.get("next"));

      if (!code) {
        setMessage("Google did not return a sign-in code. Please try again.");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (cancelled) {
        return;
      }

      if (error) {
        setMessage(`Google sign-in could not be completed: ${error.message}`);
        return;
      }

      window.history.replaceState(null, "", next);
      window.location.replace(next);
    }

    void completeSignIn();

    return () => {
      cancelled = true;
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
          Auth Callback
        </p>
        <h1 style={{ fontSize: "36px", margin: "0 0 12px" }}>
          Finishing Google sign-in
        </h1>
        <p style={{ color: "rgba(232,238,248,0.72)", lineHeight: 1.7, margin: 0 }}>
          {message}
        </p>
      </section>
    </main>
  );
}
