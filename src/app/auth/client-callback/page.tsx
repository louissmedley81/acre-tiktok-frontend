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
      const urlError = url.searchParams.get("error_description") ?? url.searchParams.get("error");

      if (!code) {
        setMessage(urlError ?? "Google did not return a sign-in code. Please try again.");
        return;
      }

      const supabase = createClient();

      const finish = () => {
        window.history.replaceState(null, "", next);
        window.location.replace(next);
      };

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session) {
          subscription.unsubscribe();
          finish();
        }
      });

      window.setTimeout(() => {
        subscription.unsubscribe();
      }, 8000);

      await new Promise((resolve) => window.setTimeout(resolve, 1000));

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) {
        subscription.unsubscribe();
        return;
      }

      if (session) {
        subscription.unsubscribe();
        finish();
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (cancelled) {
        subscription.unsubscribe();
        return;
      }

      if (error) {
        subscription.unsubscribe();
        setMessage(`Google sign-in could not be completed: ${error.message}`);
        return;
      }

      subscription.unsubscribe();
      finish();
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
