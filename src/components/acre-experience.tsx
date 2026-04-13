"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type InitialUser = {
  email: string | null;
  id: string;
} | null;

type Screen = "campaigns" | "dashboard" | "oauth" | "signup" | "upload";

type Viewer = {
  email: string | null;
  id: string;
} | null;

type ProviderKey = "tiktok" | "x";

type ConnectionState = {
  profile?: {
    handle?: string | null;
    id?: string | null;
    imageUrl?: string | null;
    name?: string | null;
  };
  payload?: string;
  status: "connected" | "error" | "idle" | "loading";
};

type Props = {
  backendBaseUrl: string;
  initialUser: InitialUser;
  supabaseReady: boolean;
};

const navItems: Array<{ key: Screen; label: string }> = [
  { key: "signup", label: "Sign In" },
  { key: "oauth", label: "Link Channels" },
  { key: "campaigns", label: "Campaigns" },
  { key: "upload", label: "Submit" },
  { key: "dashboard", label: "Dashboard" },
];

const campaigns = [
  {
    brand: "GameVault Studios",
    cpm: "$8.50",
    label: "Hot",
    spots: "23 spots left",
    summary: "Summer Drop Highlight Reels",
    theme: "theme-signal",
  },
  {
    brand: "UrbanKicks Co.",
    cpm: "$12.00",
    label: "Fashion",
    spots: "58 spots left",
    summary: "Street Style Challenge",
    theme: "theme-lime",
  },
  {
    brand: "FreshBite Delivery",
    cpm: "$6.25",
    label: "Closing Soon",
    spots: "5 spots left",
    summary: "Taste Test Reactions",
    theme: "theme-warm",
  },
];

const performanceStats = [
  { label: "Total Views Driven", value: "1.24M", note: "+18.3% vs last week" },
  { label: "Total Earnings", value: "$4,218.40", note: "+$892.10 this period" },
  { label: "Active Campaigns", value: "3", note: "2 clips pending review" },
  { label: "Avg. Engagement", value: "6.8%", note: "+1.2% vs platform avg" },
];

const CALLBACK_RETRY_ATTEMPTS = 8;
const CALLBACK_RETRY_DELAY_MS = 750;

const recentPosts = [
  ["GameVault clutch montage", "142.3K views", "+$1,209.55"],
  ["Insane triple kill edit", "87.1K views", "+$740.35"],
  ["UrbanKicks styling cut", "214.8K views", "+$2,577.60"],
];

const payoutHistory = [
  ["Apr 01, 2026", "Paid", "+$1,456.30"],
  ["Mar 15, 2026", "Paid", "+$870.00"],
  ["Mar 01, 2026", "Paid", "+$624.50"],
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function sanitizeConnectionForStorage(connection: ConnectionState) {
  return {
    profile: connection.profile,
    status:
      connection.status === "connected" ||
      connection.status === "error" ||
      connection.status === "idle"
        ? connection.status
        : "idle",
  };
}

function sanitizeConnectionsForStorage(connections: {
  tiktok: ConnectionState;
  x: ConnectionState;
}) {
  return {
    tiktok: sanitizeConnectionForStorage(connections.tiktok),
    x: sanitizeConnectionForStorage(connections.x),
  };
}

function parseStoredConnections(user: User | null) {
  const rawConnections =
    isRecord(user?.user_metadata) && "connections" in user.user_metadata
      ? user.user_metadata.connections
      : null;

  const fallback = {
    tiktok: { status: "idle" } as ConnectionState,
    x: { status: "idle" } as ConnectionState,
  };

  if (!isRecord(rawConnections)) {
    return fallback;
  }

  const parseConnection = (provider: ProviderKey): ConnectionState => {
    const candidate =
      provider in rawConnections &&
      isRecord(rawConnections[provider])
        ? rawConnections[provider]
        : null;

    if (!candidate) {
      return { status: "idle" };
    }

    const status =
      "status" in candidate &&
      (candidate.status === "connected" ||
        candidate.status === "error" ||
        candidate.status === "idle" ||
        candidate.status === "loading")
        ? candidate.status
        : "idle";

    const profile =
      "profile" in candidate &&
      isRecord(candidate.profile)
        ? {
            handle:
              "handle" in candidate.profile && typeof candidate.profile.handle === "string"
                ? candidate.profile.handle
                : null,
            id:
              "id" in candidate.profile && typeof candidate.profile.id === "string"
                ? candidate.profile.id
                : null,
            imageUrl:
              "imageUrl" in candidate.profile &&
              typeof candidate.profile.imageUrl === "string"
                ? candidate.profile.imageUrl
                : null,
            name:
              "name" in candidate.profile && typeof candidate.profile.name === "string"
                ? candidate.profile.name
                : null,
          }
        : undefined;

    const payload =
      "payload" in candidate && typeof candidate.payload === "string"
        ? candidate.payload
        : undefined;

    return {
      payload,
      profile,
      status,
    };
  };

  return {
    tiktok: parseConnection("tiktok"),
    x: parseConnection("x"),
  };
}

function buildConnectionState(provider: ProviderKey, json: unknown): ConnectionState {
  const payload = JSON.stringify(json, null, 2);

  if (provider === "tiktok") {
    const data =
      isRecord(json) && "data" in json && isRecord(json.data)
        ? json.data
        : null;

    return {
      payload,
      profile: data
        ? {
            handle: null,
            id:
              "open_id" in data && typeof data.open_id === "string" ? data.open_id : null,
            imageUrl:
              "avatar_url" in data && typeof data.avatar_url === "string"
                ? data.avatar_url
                : null,
            name:
              "display_name" in data && typeof data.display_name === "string"
                ? data.display_name
                : null,
          }
        : undefined,
      status: "connected",
    };
  }

  const data =
    isRecord(json) && "data" in json && isRecord(json.data)
      ? json.data
      : null;

  return {
    payload,
    profile: data
      ? {
          handle:
            "username" in data && typeof data.username === "string" ? data.username : null,
          id: "id" in data && typeof data.id === "string" ? data.id : null,
          imageUrl:
            "profile_image_url" in data && typeof data.profile_image_url === "string"
              ? data.profile_image_url
              : null,
          name: "name" in data && typeof data.name === "string" ? data.name : null,
        }
      : undefined,
    status: "connected",
  };
}

function formatViewer(user: User | Viewer): Viewer {
  if (!user) {
    return null;
  }

  return {
    email: user.email ?? null,
    id: user.id,
  };
}

export function AcreExperience({
  backendBaseUrl,
  initialUser,
  supabaseReady,
}: Props) {
  const [activeScreen, setActiveScreen] = useState<Screen>("signup");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [viewer, setViewer] = useState<Viewer>(initialUser);
  const [connections, setConnections] = useState<{
    tiktok: ConnectionState;
    x: ConnectionState;
  }>({
    tiktok: { status: "idle" },
    x: { status: "idle" },
  });
  const [supabase] = useState(() => {
    if (!supabaseReady) {
      return null;
    }

    try {
      return createClient();
    } catch {
      return null;
    }
  });

  const persistConnections = useEffectEvent(async (nextConnections: {
    tiktok: ConnectionState;
    x: ConnectionState;
  }) => {
    if (!supabase) {
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: {
        connections: sanitizeConnectionsForStorage(nextConnections),
      },
    });

    if (error) {
      console.error("Unable to persist provider connections", error);
    }
  });

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setViewer(formatViewer(session?.user ?? null));
      setConnections((current) => {
        const stored = parseStoredConnections(session?.user ?? null);

        return {
          tiktok:
            current.tiktok.status === "loading" ? current.tiktok : stored.tiktok,
          x: current.x.status === "loading" ? current.x : stored.x,
        };
      });
    });

    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setViewer(formatViewer(data.user));
        setConnections(parseStoredConnections(data.user));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tasks: Promise<void>[] = [];
    const hasConnectionMarker =
      params.get("tiktok") === "connected" || params.get("x") === "connected";

    const loadConnection = async (
      provider: ProviderKey,
      endpoint: string,
      label: string,
      options?: {
        persistOnSuccess?: boolean;
        retryAfterCallback?: boolean;
      },
    ) => {
      setConnections((current) => ({
        ...current,
        [provider]: { status: "loading" },
      }));

      const maxAttempts = options?.retryAfterCallback ? CALLBACK_RETRY_ATTEMPTS : 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const response = await fetch(`${backendBaseUrl}${endpoint}`, {
            credentials: "include",
          });
          const json = await response.json().catch(() => ({
            error: `${label} returned a non-JSON response`,
            status: response.status,
          }));

          if (response.ok) {
            const nextProviderState = buildConnectionState(provider, json);

            setConnections((current) => {
              const nextConnections = {
                ...current,
                [provider]: nextProviderState,
              };

              if (options?.persistOnSuccess) {
                void persistConnections(nextConnections);
              }

              return nextConnections;
            });

            return;
          }

          if (
            options?.retryAfterCallback &&
            response.status === 401 &&
            attempt < maxAttempts
          ) {
            await wait(CALLBACK_RETRY_DELAY_MS);
            continue;
          }

          const nextState: ConnectionState =
            response.status === 401
              ? { status: "idle" }
              : {
                  payload: JSON.stringify(json, null, 2),
                  status: "error",
                };

          setConnections((current) => {
            const nextConnections = {
              ...current,
              [provider]: nextState,
            };

            if (response.status === 401 && current[provider].status === "connected") {
              void persistConnections(nextConnections);
            }

            return nextConnections;
          });

          return;
        } catch (error) {
          if (options?.retryAfterCallback && attempt < maxAttempts) {
            await wait(CALLBACK_RETRY_DELAY_MS);
            continue;
          }

          setConnections((current) => ({
            ...current,
            [provider]: {
              payload: JSON.stringify(
                { detail: String(error), error: `Unable to load ${label}` },
                null,
                2,
              ),
              status: "error",
            },
          }));
        }
      }
    };

    if (params.get("tiktok") === "connected") {
      setActiveScreen("oauth");
      tasks.push(
        loadConnection("tiktok", "/api/tiktok-me", "TikTok profile", {
          persistOnSuccess: true,
          retryAfterCallback: true,
        }),
      );
    }

    if (params.get("x") === "connected") {
      setActiveScreen("oauth");
      tasks.push(
        loadConnection("x", "/api/auth/x-me", "X profile", {
          persistOnSuccess: true,
          retryAfterCallback: true,
        }),
      );
    }

    if (!params.get("tiktok") && !params.get("x")) {
      tasks.push(loadConnection("tiktok", "/api/tiktok-me", "TikTok profile"));
      tasks.push(loadConnection("x", "/api/auth/x-me", "X profile"));
    }

    void Promise.allSettled(tasks).then(() => {
      if (hasConnectionMarker) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    });
  }, [backendBaseUrl, supabase]);

  async function handleGoogleSignIn() {
    if (!supabase) {
      setAuthMessage(
        "Add your Supabase URL and publishable key to enable Google sign-in.",
      );
      return;
    }

    setAuthPending(true);
    setAuthMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        redirectTo: `${window.location.origin}/auth/client-callback?next=/`,
      },
    });

    if (error) {
      setAuthMessage(error.message);
      setAuthPending(false);
    }
  }

  async function handleSignOut() {
    if (!supabase) {
      return;
    }

    setAuthPending(true);
    setAuthMessage(null);

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthMessage(error.message);
      setAuthPending(false);
      return;
    }

    setViewer(null);
    setActiveScreen("signup");
    setAuthPending(false);
  }

  async function startProviderLink(path: string) {
    if (!supabase) {
      window.location.href = `${backendBaseUrl}${path}`;
      return;
    }

    setAuthMessage(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const accessToken = session?.access_token;

    if (!accessToken) {
      window.location.href = `${backendBaseUrl}${path}`;
      return;
    }

    try {
      const response = await fetch(`${backendBaseUrl}${path}?return=json`, {
        credentials: "include",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const json = await response.json().catch(() => ({
        error: "Provider auth start returned a non-JSON response.",
      }));

      if (!response.ok || !json.url || typeof json.url !== "string") {
        throw new Error(
          typeof json.error === "string"
            ? json.error
            : "Unable to start the provider connection flow.",
        );
      }

      window.location.href = json.url;
    } catch (error) {
      console.error("Unable to bridge Supabase session into provider link", error);
      window.location.href = `${backendBaseUrl}${path}`;
    }
  }

  return (
    <main className="acre-shell">
      <div className="acre-orb acre-orb-lime" />
      <div className="acre-orb acre-orb-signal" />

      <header className="acre-topbar">
        <div>
          <p className="eyebrow">Acre Creator System</p>
          <h1>ACRE</h1>
        </div>
        <div className="topbar-status">
          <span className="status-pill mono">
            {viewer ? "live auth" : "migration build"}
          </span>
          <span className="status-pill status-pill-muted mono">v0.2 foundation</span>
        </div>
      </header>

      <nav className="acre-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={item.key === activeScreen ? "nav-chip active" : "nav-chip"}
            onClick={() => setActiveScreen(item.key)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </nav>

      <section className="hero-grid">
        <div className="hero-copy acre-panel">
          <p className="eyebrow">Migration In Progress</p>
          <h2>
            Your frontend is now moving onto a structure that can actually support
            real auth, stored creator data, and a proper dashboard.
          </h2>
          <p className="hero-text">
            Google sign-in is handled by Supabase, while TikTok and X still route
            through your existing Vercel backend for now. That gives us a cleaner
            foundation without breaking the working social connection flow.
          </p>
          <div className="hero-metrics">
            <div>
              <span className="metric-label mono">Auth Layer</span>
              <strong>Supabase Google OAuth</strong>
            </div>
            <div>
              <span className="metric-label mono">Backend Link</span>
              <strong>{backendBaseUrl.replace(/^https?:\/\//, "")}</strong>
            </div>
          </div>
        </div>

        <div className="hero-side acre-panel">
          <p className="eyebrow">Account State</p>
          <div className="account-card">
            <span className="account-badge">{viewer ? "ON" : "OFF"}</span>
            <div>
              <h3>{viewer ? "Signed in with Supabase" : "Google sign-in ready"}</h3>
              <p>
                {viewer?.email ??
                  "Add your Supabase keys and Google provider settings to turn on live auth."}
              </p>
            </div>
          </div>
          {!supabaseReady && (
            <div className="inline-note">
              Supabase keys are not configured yet, so the Google button will stay in
              setup mode until `.env.local` is added.
            </div>
          )}
          {authMessage && <div className="inline-note inline-note-error">{authMessage}</div>}
        </div>
      </section>

      <section className={activeScreen === "signup" ? "screen active" : "screen"}>
        <div className="signup-grid">
          <div className="acre-panel">
            <p className="eyebrow">Step 1</p>
            <h3>Sign into ACRE</h3>
            <p className="section-copy">
              This is the new account entry point. Once you are signed in here, we can
              attach linked channels, client stats, payouts, and future database tables
              to a real user identity.
            </p>

            <div className="field-grid">
              <label>
                <span className="field-label mono">First name</span>
                <input className="text-field" placeholder="Joe" />
              </label>
              <label>
                <span className="field-label mono">Last name</span>
                <input className="text-field" placeholder="Smedley" />
              </label>
              <label>
                <span className="field-label mono">Email</span>
                <input className="text-field" placeholder="joe@example.com" />
              </label>
              <label>
                <span className="field-label mono">Brand / studio</span>
                <input className="text-field" placeholder="ACRE Media" />
              </label>
            </div>

            <div className="button-stack">
              <button
                className="primary-button"
                onClick={() => setActiveScreen("oauth")}
                type="button"
              >
                Continue into channel setup
              </button>
              <button
                className="ghost-button"
                disabled={authPending}
                onClick={viewer ? handleSignOut : handleGoogleSignIn}
                type="button"
              >
                {authPending
                  ? "Working..."
                  : viewer
                    ? "Sign out"
                    : "Sign in with Google"}
              </button>
            </div>
          </div>

          <div className="acre-panel feature-card">
            <p className="eyebrow">Why This Matters</p>
            <ul className="feature-list">
              <li>Google auth can become your clean app identity layer.</li>
              <li>Supabase sessions replace hand-rolled account state in the browser.</li>
              <li>Channel stats and payout history can move into actual tables next.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={activeScreen === "oauth" ? "screen active" : "screen"}>
        <div className="oauth-grid">
          <div className="acre-panel">
            <p className="eyebrow">Step 2</p>
            <h3>Link your publishing channels</h3>
            <p className="section-copy">
              TikTok and X are still powered by your live Vercel backend, so the migration
              keeps the flows you already had while the rest of the app catches up.
            </p>

            <div className="provider-grid">
              <button
                className="provider-card"
                onClick={() => void startProviderLink("/api/auth/tiktok")}
                type="button"
              >
                <span className="provider-mark provider-mark-tiktok mono">TT</span>
                <span>
                  <strong>Continue with TikTok</strong>
                  <small>OAuth handled by your existing backend.</small>
                </span>
              </button>
              <button
                className="provider-card"
                onClick={() => void startProviderLink("/api/auth/x")}
                type="button"
              >
                <span className="provider-mark provider-mark-x mono">X</span>
                <span>
                  <strong>Continue with X</strong>
                  <small>PKCE flow remains active through Vercel.</small>
                </span>
              </button>
            </div>
          </div>

          <div className="acre-panel">
            <p className="eyebrow">Connection Debug</p>
            <div className="connection-block">
              <div className="connection-header">
                <strong>TikTok</strong>
                <span className={`connection-pill ${connections.tiktok.status}`}>
                  {connections.tiktok.status}
                </span>
              </div>
              <pre className="json-box mono">
                {connections.tiktok.payload ?? "Connect TikTok to load live profile data here."}
              </pre>
            </div>

            <div className="connection-block">
              <div className="connection-header">
                <strong>X</strong>
                <span className={`connection-pill ${connections.x.status}`}>
                  {connections.x.status}
                </span>
              </div>
              <pre className="json-box mono">
                {connections.x.payload ?? "Connect X to load live profile data here."}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className={activeScreen === "campaigns" ? "screen active" : "screen"}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Step 3</p>
            <h3>Campaign feed</h3>
          </div>
          <p className="section-copy">
            This stays close to your original wireframe, but it now lives in real React
            components instead of a single HTML file.
          </p>
        </div>

        <div className="card-grid">
          {campaigns.map((campaign) => (
            <article key={campaign.summary} className={`campaign-card ${campaign.theme}`}>
              <div className="campaign-banner">
                <span className="campaign-badge mono">{campaign.label}</span>
                <div>
                  <p className="campaign-brand">{campaign.brand}</p>
                  <h4>{campaign.summary}</h4>
                </div>
              </div>
              <div className="campaign-meta">
                <div>
                  <span className="metric-label mono">CPM</span>
                  <strong>{campaign.cpm}</strong>
                </div>
                <div>
                  <span className="metric-label mono">Availability</span>
                  <strong>{campaign.spots}</strong>
                </div>
              </div>
              <button
                className="ghost-button compact"
                onClick={() => setActiveScreen("upload")}
                type="button"
              >
                Opt into campaign
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className={activeScreen === "upload" ? "screen active" : "screen"}>
        <div className="upload-grid">
          <div className="acre-panel">
            <p className="eyebrow">Step 4</p>
            <h3>Submit content links</h3>
            <p className="section-copy">
              This is the piece that should eventually write to Supabase tables instead of
              sitting as static browser state. For now, the UI is ready for that next step.
            </p>
            <div className="link-row">
              <input
                className="text-field"
                placeholder="https://www.tiktok.com/@username/video/..."
              />
              <button className="primary-button compact" type="button">
                Add link
              </button>
            </div>
            <div className="list-card">
              <div className="list-row">
                <span className="sync-dot sync-dot-live" />
                <span>tiktok.com/@marcusedits_/video/7348291056</span>
                <strong>142.3K views</strong>
              </div>
              <div className="list-row">
                <span className="sync-dot sync-dot-live" />
                <span>tiktok.com/@marcusedits_/video/7351982034</span>
                <strong>87.1K views</strong>
              </div>
              <div className="list-row">
                <span className="sync-dot sync-dot-pending" />
                <span>tiktok.com/@marcusedits_/video/7356102841</span>
                <strong>Pending sync</strong>
              </div>
            </div>
          </div>

          <div className="acre-panel">
            <p className="eyebrow">Campaign Rules</p>
            <ul className="feature-list">
              <li>Use original edits and post from your linked account.</li>
              <li>Attach paid partnership labeling in the final caption.</li>
              <li>Save content performance snapshots to Supabase in the next backend pass.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={activeScreen === "dashboard" ? "screen active" : "screen"}>
        <div className="section-head">
          <div>
            <p className="eyebrow">Step 5</p>
            <h3>Dashboard foundation</h3>
          </div>
          <p className="section-copy">
            These numbers are still mock data, but the screen is now positioned inside a
            real app structure where we can replace them with Supabase-backed stats.
          </p>
        </div>

        <div className="stats-grid">
          {performanceStats.map((stat) => (
            <article key={stat.label} className="stat-card">
              <span className="metric-label mono">{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.note}</p>
            </article>
          ))}
        </div>

        <div className="dashboard-grid">
          <div className="acre-panel">
            <div className="chart-card">
              <div className="chart-header">
                <h4>Views over time</h4>
                <span className="status-pill mono">hourly sync next</span>
              </div>
              <div className="chart-bars" aria-hidden="true">
                {[35, 42, 38, 55, 68, 52, 78, 95, 85, 72, 88, 100, 90, 65].map((value) => (
                  <span key={value} className="chart-bar" style={{ height: `${value}%` }} />
                ))}
              </div>
            </div>

            <div className="feed-card">
              <h4>Recent posts</h4>
              {recentPosts.map(([title, views, earnings]) => (
                <div key={title} className="feed-row">
                  <div>
                    <strong>{title}</strong>
                    <p>{views}</p>
                  </div>
                  <span>{earnings}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="acre-panel">
            <h4>Earnings and payouts</h4>
            <div className="balance-card">
              <span className="metric-label mono">Available balance</span>
              <strong>$1,892.10</strong>
              <p>Next payout target: Apr 28, 2026</p>
            </div>
            {payoutHistory.map(([date, status, amount]) => (
              <div key={date} className="feed-row">
                <div>
                  <strong>{date}</strong>
                  <p>{status}</p>
                </div>
                <span>{amount}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
