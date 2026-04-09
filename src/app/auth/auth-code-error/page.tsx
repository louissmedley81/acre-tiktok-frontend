export default function AuthCodeErrorPage() {
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
          Google sign-in could not be completed.
        </h1>
        <p style={{ color: "rgba(232,238,248,0.72)", lineHeight: 1.7, margin: 0 }}>
          Double-check your Supabase Google provider setup and the allowed redirect
          URLs, then try again from the homepage.
        </p>
      </section>
    </main>
  );
}
