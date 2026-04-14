"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type InitialUser = {
  email: string | null;
  id: string;
} | null;

type Screen = "campaigns" | "dashboard" | "oauth" | "upload";

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

const navItems: Array<{
  icon: string;
  key: Screen;
  label: string;
  note: string;
}> = [
  { icon: "DB", key: "dashboard", label: "Dashboard", note: "Overview" },
  { icon: "LC", key: "oauth", label: "Link Channels", note: "TikTok + X" },
  { icon: "CP", key: "campaigns", label: "Campaigns", note: "Active briefs" },
  { icon: "SB", key: "upload", label: "Submit", note: "Content links" },
];

const screenMeta: Record<
  Screen,
  {
    eyebrow: string;
    summary: string;
    title: string;
  }
> = {
  campaigns: {
    eyebrow: "Campaigns",
    summary: "Browse available paid briefs and jump straight into content submission.",
    title: "Campaign feed",
  },
  dashboard: {
    eyebrow: "Dashboard",
    summary: "A cleaner home base for views, earnings, campaign activity, and channel health.",
    title: "Creator performance",
  },
  oauth: {
    eyebrow: "Channels",
    summary: "Connect TikTok and X so ACRE can attach future stats to your creator profile.",
    title: "Link channels",
  },
  upload: {
    eyebrow: "Submit",
    summary: "Add post links for campaign review and future performance tracking.",
    title: "Submit content",
  },
};

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

function mergeStoredConnections(
  current: {
    tiktok: ConnectionState;
    x: ConnectionState;
  },
  stored: {
    tiktok: ConnectionState;
    x: ConnectionState;
  },
) {
  const keepFreshConnection = (
    provider: ProviderKey,
  ): ConnectionState =>
    current[provider].status === "connected" && stored[provider].status !== "connected"
      ? current[provider]
      : stored[provider];

  return {
    tiktok:
      current.tiktok.status === "loading"
        ? current.tiktok
        : keepFreshConnection("tiktok"),
    x: current.x.status === "loading" ? current.x : keepFreshConnection("x"),
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

function buildVerifiedConnectionState(provider: ProviderKey): ConnectionState {
  return {
    payload: JSON.stringify(
      {
        detail:
          "The backend OAuth callback confirmed this channel before returning to ACRE.",
        provider,
        source: "backend_callback",
      },
      null,
      2,
    ),
    status: "connected",
  };
}

export function AcreExperience({
  backendBaseUrl,
  initialUser,
  supabaseReady,
}: Props) {
  const [activeScreen, setActiveScreen] = useState<Screen>("dashboard");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
        return mergeStoredConnections(current, stored);
      });
    });

    void supabase.auth
      .getUser()
      .then(({ data }) => {
        if (data.user) {
          setViewer(formatViewer(data.user));
          setConnections((current) =>
            mergeStoredConnections(current, parseStoredConnections(data.user)),
          );
        }
      })
      .catch((error) => {
        console.error("Unable to load Supabase user", error);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasConnectionMarker =
      params.get("tiktok") === "connected" || params.get("x") === "connected";

    if (params.get("tiktok") === "connected") {
      setActiveScreen("oauth");
      setConnections((current) => ({
        ...current,
        tiktok:
          current.tiktok.status === "connected"
            ? current.tiktok
            : buildVerifiedConnectionState("tiktok"),
      }));
    }

    if (params.get("x") === "connected") {
      setActiveScreen("oauth");
      setConnections((current) => ({
        ...current,
        x:
          current.x.status === "connected"
            ? current.x
            : buildVerifiedConnectionState("x"),
      }));
    }

    if (hasConnectionMarker) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

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
    setActiveScreen("dashboard");
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

  const activeMeta = screenMeta[activeScreen];

  return (
    <main className={sidebarOpen ? "acre-app sidebar-open" : "acre-app sidebar-collapsed"}>
      <div className="acre-orb acre-orb-lime" />
      <div className="acre-orb acre-orb-signal" />

      <aside className="acre-sidebar" aria-label="Main navigation">
        <div className="sidebar-brand">
          <span className="brand-mark mono">A</span>
          <div className="sidebar-brand-copy">
            <strong>ACRE</strong>
            <small>Creator dashboard</small>
          </div>
          <button
            aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            className="sidebar-toggle"
            onClick={() => setSidebarOpen((open) => !open)}
            type="button"
          >
            {sidebarOpen ? "<" : ">"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={item.key === activeScreen ? "sidebar-link active" : "sidebar-link"}
              onClick={() => setActiveScreen(item.key)}
              type="button"
            >
              <span className="sidebar-icon mono">{item.icon}</span>
              <span className="sidebar-label">
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="metric-label mono">Connected</span>
          <div className="sidebar-status-row">
            <span className={`connection-dot ${connections.tiktok.status}`} />
            <span>TikTok</span>
          </div>
          <div className="sidebar-status-row">
            <span className={`connection-dot ${connections.x.status}`} />
            <span>X</span>
          </div>
        </div>
      </aside>

      <div className="acre-main">
        <header className="app-header">
          <div className="header-copy-block">
            <p className="eyebrow">{activeMeta.eyebrow}</p>
            <h1>{activeMeta.title}</h1>
            <p>{activeMeta.summary}</p>
          </div>
          <div className="header-actions">
            <span className="status-pill mono">{viewer ? "signed in" : "guest"}</span>
            <button
              className="signin-button"
              disabled={authPending}
              onClick={viewer ? handleSignOut : handleGoogleSignIn}
              type="button"
            >
              {authPending ? "Working..." : viewer ? "Sign out" : "Sign in"}
            </button>
          </div>
        </header>

        {!supabaseReady && (
          <div className="inline-note">
            Supabase keys are not configured yet, so Google sign-in will stay in
            setup mode until the public env vars are available.
          </div>
        )}
        {authMessage && <div className="inline-note inline-note-error">{authMessage}</div>}

        <section className={activeScreen === "oauth" ? "screen active" : "screen"}>
        <div className="oauth-grid">
          <div className="acre-panel">
            <p className="eyebrow">Publishing Channels</p>
            <h3>Link your publishing channels</h3>
            <p className="section-copy">
              Connect the accounts you want ACRE to track. TikTok and X still run
              through the hardened backend callback flow.
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
            <p className="eyebrow">Connection Status</p>
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
            <p className="eyebrow">Open Briefs</p>
            <h3>Campaign feed</h3>
          </div>
          <p className="section-copy">
            Review available campaigns, compare CPMs, and choose the next brief to submit.
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
            <p className="eyebrow">Content Intake</p>
            <h3>Submit content links</h3>
            <p className="section-copy">
              Drop in TikTok or X links for review. This panel is ready to connect
              to Supabase-backed submissions next.
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
            <p className="eyebrow">Home</p>
            <h3>Dashboard</h3>
          </div>
          <p className="section-copy">
            A quick read on account performance, active posts, and payout movement.
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
      </div>
    </main>
  );
}
