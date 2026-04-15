"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type InitialUser = {
  email: string | null;
  id: string;
} | null;

type Screen = "campaigns" | "dashboard" | "oauth" | "upload";

type NavIcon = "campaigns" | "dashboard" | "link" | "submit";

type AuthMethod = "email" | "phone";
type AuthModalMode = "signin" | "signup";
type AuthStep = "email-sent" | "entry" | "sms-code";

type Viewer = {
  avatarUrl?: string | null;
  email: string | null;
  id: string;
  name?: string | null;
  phone?: string | null;
} | null;

type ProviderKey = "tiktok" | "x";

type ConnectionState = {
  connectedAt?: string | null;
  profile?: {
    handle?: string | null;
    id?: string | null;
    imageUrl?: string | null;
    name?: string | null;
  };
  payload?: string;
  status: "connected" | "error" | "idle" | "loading";
};

type ConnectionsState = {
  tiktok: ConnectionState;
  x: ConnectionState;
};

type Props = {
  backendBaseUrl: string;
  initialUser: InitialUser;
  supabaseReady: boolean;
};

const navItems: Array<{
  icon: NavIcon;
  key: Screen;
  label: string;
  note: string;
}> = [
  { icon: "dashboard", key: "dashboard", label: "Dashboard", note: "Overview" },
  { icon: "link", key: "oauth", label: "Link Channels", note: "TikTok + X" },
  { icon: "campaigns", key: "campaigns", label: "Campaigns", note: "Active briefs" },
  { icon: "submit", key: "upload", label: "Submit", note: "Content links" },
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

function getOptionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function getConnectionStatus(value: unknown): ConnectionState["status"] {
  return value === "connected" ||
    value === "error" ||
    value === "idle" ||
    value === "loading"
    ? value
    : "idle";
}

function parseConnectionProfile(
  value: unknown,
): ConnectionState["profile"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const profile = {
    handle: getOptionalString(value.handle),
    id: getOptionalString(value.id),
    imageUrl: getOptionalString(value.imageUrl),
    name: getOptionalString(value.name),
  };

  return Object.values(profile).some(Boolean) ? profile : undefined;
}

function buildConnectionPayload({
  connectedAt,
  profile,
  provider,
  source,
  status,
}: {
  connectedAt?: string | null;
  profile?: ConnectionState["profile"];
  provider: ProviderKey;
  source: string;
  status: ConnectionState["status"];
}) {
  return JSON.stringify(
    {
      connectedAt: connectedAt ?? null,
      profile: profile ?? null,
      provider,
      source,
      status,
    },
    null,
    2,
  );
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

    const connectedAt = getOptionalString(candidate.connectedAt);
    const status = getConnectionStatus(candidate.status);
    const profile = parseConnectionProfile(candidate.profile);
    const payload =
      getOptionalString(candidate.payload) ??
      (status === "connected"
        ? buildConnectionPayload({
            connectedAt,
            profile,
            provider,
            source: "supabase_user_metadata",
            status,
          })
        : undefined);

    return {
      connectedAt,
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

function parsePersistedConnections(value: unknown) {
  const fallback = {
    tiktok: { status: "idle" } as ConnectionState,
    x: { status: "idle" } as ConnectionState,
  };

  if (!isRecord(value) || !isRecord(value.connections)) {
    return fallback;
  }

  const rawConnections = value.connections;

  const parseConnection = (provider: ProviderKey): ConnectionState => {
    const candidate = rawConnections[provider];

    if (!isRecord(candidate)) {
      return { status: "idle" };
    }

    const connectedAt = getOptionalString(candidate.connectedAt);
    const status = getConnectionStatus(candidate.status);
    const profile = parseConnectionProfile(candidate.profile);

    return {
      connectedAt,
      payload:
        status === "connected"
          ? buildConnectionPayload({
              connectedAt,
              profile,
              provider,
              source: "supabase_social_connections",
              status,
            })
          : undefined,
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
  current: ConnectionsState,
  stored: ConnectionsState,
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

function markConnectionsLoading(current: ConnectionsState): ConnectionsState {
  return {
    tiktok:
      current.tiktok.status === "connected"
        ? current.tiktok
        : { ...current.tiktok, status: "loading" },
    x:
      current.x.status === "connected"
        ? current.x
        : { ...current.x, status: "loading" },
  };
}

function mergeFetchedConnections(
  current: ConnectionsState,
  fetched: ConnectionsState,
): ConnectionsState {
  const mergeProvider = (provider: ProviderKey): ConnectionState => {
    if (fetched[provider].status === "connected") {
      return fetched[provider];
    }

    if (current[provider].status === "loading") {
      return { status: "idle" };
    }

    return current[provider];
  };

  return {
    tiktok: mergeProvider("tiktok"),
    x: mergeProvider("x"),
  };
}

function getMetadataString(
  metadata: Record<string, unknown>,
  keys: string[],
) {
  for (const key of keys) {
    const value = metadata[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

function formatViewer(user: User | Viewer): Viewer {
  if (!user) {
    return null;
  }

  const metadata =
    "user_metadata" in user && isRecord(user.user_metadata)
      ? user.user_metadata
      : {};

  return {
    avatarUrl: getMetadataString(metadata, ["avatar_url", "picture", "avatarUrl"]),
    email: user.email ?? null,
    id: user.id,
    name: getMetadataString(metadata, [
      "full_name",
      "name",
      "preferred_username",
      "user_name",
    ]),
    phone: "phone" in user && typeof user.phone === "string" ? user.phone : null,
  };
}

function formatViewerName(viewer: Viewer) {
  if (!viewer) {
    return "Creator";
  }

  if (viewer.name) {
    return viewer.name;
  }

  const emailName = viewer.email?.split("@")[0] ?? "";
  const cleanedName = emailName
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\d+/g, " ")
    .replace(/[._-]+/g, " ")
    .trim();

  if (cleanedName) {
    return cleanedName
      .split(/\s+/)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");
  }

  return viewer.phone ?? "Creator";
}

function getViewerInitials(viewer: Viewer) {
  const label = formatViewerName(viewer);
  const parts = label
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return "A";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
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

function SidebarIcon({ icon }: { icon: NavIcon }) {
  const commonProps = {
    "aria-hidden": true,
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  switch (icon) {
    case "campaigns":
      return (
        <svg {...commonProps}>
          <path d="M4 13.5V9.75c0-.7.48-1.31 1.16-1.47l8.74-2.1v10.9l-8.74-2.1A1.51 1.51 0 0 1 4 13.5Z" />
          <path d="M13.9 8.4h1.7a4 4 0 0 1 0 6.4h-1.7" />
          <path d="m7.2 15.4 1.16 3.5c.18.53.68.9 1.24.9h1.85" />
        </svg>
      );
    case "dashboard":
      return (
        <svg {...commonProps}>
          <path d="M4.5 13.5a7.5 7.5 0 0 1 15 0" />
          <path d="M12 13.5 16.2 8.8" />
          <path d="M7.2 18.5h9.6" />
          <path d="M6.4 13.5h1.2" />
          <path d="M16.4 13.5h1.2" />
          <path d="M8.1 9.6 7.25 8.8" />
        </svg>
      );
    case "link":
      return (
        <svg {...commonProps}>
          <path d="M9.4 14.6 14.6 9.4" />
          <path d="M8.6 10.9 6.8 12.7a3.7 3.7 0 1 0 5.2 5.2l1.8-1.8" />
          <path d="m10.2 7.9 1.8-1.8a3.7 3.7 0 1 1 5.2 5.2l-1.8 1.8" />
        </svg>
      );
    case "submit":
      return (
        <svg {...commonProps}>
          <path d="M5 12.5 19 5l-4.2 14-3.1-5.6L5 12.5Z" />
          <path d="m11.7 13.4 3.7-3.7" />
        </svg>
      );
  }
}

export function AcreExperience({
  backendBaseUrl,
  initialUser,
  supabaseReady,
}: Props) {
  const [activeScreen, setActiveScreen] = useState<Screen>("dashboard");
  const [authCode, setAuthCode] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("email");
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode | null>(null);
  const [authPending, setAuthPending] = useState(false);
  const [authPhone, setAuthPhone] = useState("");
  const [authStep, setAuthStep] = useState<AuthStep>("entry");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewer, setViewer] = useState<Viewer>(initialUser);
  const [connections, setConnections] = useState<ConnectionsState>({
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
      if (session?.user) {
        setAuthModalMode(null);
        setAuthMessage(null);
        setAuthStep("entry");
      }
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
    if (!supabase || !viewer?.id) {
      return;
    }

    let cancelled = false;
    const supabaseClient = supabase;

    async function loadPersistedConnections() {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        return;
      }

      if (!cancelled) {
        setConnections(markConnectionsLoading);
      }

      try {
        const response = await fetch(`${backendBaseUrl}/api/auth/connections`, {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const json: unknown = await response.json().catch(() => ({
          error: "Saved connection lookup returned a non-JSON response.",
        }));

        if (!response.ok) {
          const message =
            isRecord(json) && typeof json.error === "string"
              ? json.error
              : "Unable to load saved provider connections.";
          throw new Error(message);
        }

        if (!cancelled) {
          setConnections((current) =>
            mergeFetchedConnections(current, parsePersistedConnections(json)),
          );
        }
      } catch (error) {
        console.error("Unable to load saved provider connections", error);

        if (!cancelled) {
          setConnections((current) =>
            mergeFetchedConnections(current, {
              tiktok: { status: "idle" },
              x: { status: "idle" },
            }),
          );
        }
      }
    }

    void loadPersistedConnections();

    return () => {
      cancelled = true;
    };
  }, [backendBaseUrl, supabase, viewer?.id]);

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

  function openAuthModal(mode: AuthModalMode) {
    setAuthModalMode(mode);
    setAuthMethod("email");
    setAuthStep("entry");
    setAuthCode("");
    setAuthMessage(null);
  }

  function closeAuthModal() {
    if (authPending) {
      return;
    }

    setAuthModalMode(null);
    setAuthMessage(null);
    setAuthStep("entry");
    setAuthCode("");
  }

  function switchAuthMethod(method: AuthMethod) {
    setAuthMethod(method);
    setAuthStep("entry");
    setAuthCode("");
    setAuthMessage(null);
  }

  async function handleGoogleSignIn() {
    if (!supabase) {
      setAuthModalMode((mode) => mode ?? "signin");
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

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setAuthMessage("Add your Supabase keys to enable email authentication.");
      return;
    }

    const email = authEmail.trim();

    if (!email) {
      setAuthMessage("Enter an email address to continue.");
      return;
    }

    setAuthPending(true);
    setAuthMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/client-callback?next=/`,
        shouldCreateUser: authModalMode === "signup",
      },
    });

    if (error) {
      setAuthMessage(error.message);
      setAuthPending(false);
      return;
    }

    setAuthStep("email-sent");
    setAuthMessage(`Check ${email} for your secure sign-in link.`);
    setAuthPending(false);
  }

  async function handlePhoneSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabase) {
      setAuthMessage("Add your Supabase keys to enable phone authentication.");
      return;
    }

    const phone = authPhone.trim();

    if (!phone) {
      setAuthMessage("Enter a phone number with country code, like +15555555555.");
      return;
    }

    setAuthPending(true);
    setAuthMessage(null);

    if (authStep === "sms-code") {
      const token = authCode.trim();

      if (!token) {
        setAuthMessage("Enter the verification code from your text message.");
        setAuthPending(false);
        return;
      }

      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });

      if (error) {
        setAuthMessage(error.message);
        setAuthPending(false);
        return;
      }

      setAuthModalMode(null);
      setAuthStep("entry");
      setAuthCode("");
      setAuthPending(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: {
        shouldCreateUser: authModalMode === "signup",
      },
    });

    if (error) {
      setAuthMessage(error.message);
      setAuthPending(false);
      return;
    }

    setAuthStep("sms-code");
    setAuthMessage(`We sent a verification code to ${phone}.`);
    setAuthPending(false);
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
    setConnections({
      tiktok: { status: "idle" },
      x: { status: "idle" },
    });
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
  const viewerName = formatViewerName(viewer);
  const viewerInitials = getViewerInitials(viewer);

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
              aria-label={item.label}
              className={item.key === activeScreen ? "sidebar-link active" : "sidebar-link"}
              onClick={() => setActiveScreen(item.key)}
              title={item.label}
              type="button"
            >
              <span className="sidebar-icon">
                <SidebarIcon icon={item.icon} />
              </span>
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
            {viewer ? (
              <button
                aria-label={`Signed in as ${viewerName}. Click to sign out.`}
                className="profile-button"
                disabled={authPending}
                onClick={handleSignOut}
                title={`Signed in as ${viewerName}. Click to sign out.`}
                type="button"
              >
                {viewer.avatarUrl ? (
                  <span
                    aria-hidden="true"
                    className="profile-avatar-image"
                    style={{ backgroundImage: `url(${viewer.avatarUrl})` }}
                  />
                ) : (
                  <span className="profile-initials">{viewerInitials}</span>
                )}
              </button>
            ) : (
              <div className="auth-button-row" aria-label="Account actions">
                <button
                  className="auth-top-button auth-top-button-primary"
                  disabled={authPending}
                  onClick={() => openAuthModal("signin")}
                  type="button"
                >
                  Log in
                </button>
                <button
                  className="auth-top-button auth-top-button-secondary"
                  disabled={authPending}
                  onClick={() => openAuthModal("signup")}
                  type="button"
                >
                  Sign up
                </button>
              </div>
            )}
          </div>
        </header>

        {!supabaseReady && (
          <div className="inline-note">
            Supabase keys are not configured yet, so Google sign-in will stay in
            setup mode until the public env vars are available.
          </div>
        )}
        {authMessage && !authModalMode && (
          <div className="inline-note inline-note-error">{authMessage}</div>
        )}

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
                {connections.tiktok.payload ??
                  (connections.tiktok.status === "loading"
                    ? "Checking saved TikTok connection data..."
                    : "Connect TikTok to load live profile data here.")}
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
                {connections.x.payload ??
                  (connections.x.status === "loading"
                    ? "Checking saved X connection data..."
                    : "Connect X to load live profile data here.")}
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

      {authModalMode && (
        <div className="auth-modal-backdrop">
          <section
            aria-labelledby="auth-modal-title"
            aria-modal="true"
            className="auth-modal"
            role="dialog"
          >
            <button
              aria-label="Close authentication modal"
              className="auth-close-button"
              disabled={authPending}
              onClick={closeAuthModal}
              type="button"
            >
              x
            </button>

            <div className="auth-modal-copy">
              <h2 id="auth-modal-title">Log in or sign up</h2>
              <p>
                Save your channels, submissions, and campaign progress with your
                ACRE account.
              </p>
            </div>

            <div className="auth-option-stack">
              <button
                className="auth-option-button"
                disabled={authPending}
                onClick={() => void handleGoogleSignIn()}
                type="button"
              >
                <span className="auth-provider-icon google-icon" aria-hidden="true">
                  G
                </span>
                <span>Continue with Google</span>
              </button>

              <button
                className={
                  authMethod === "phone"
                    ? "auth-option-button active"
                    : "auth-option-button"
                }
                disabled={authPending}
                onClick={() => switchAuthMethod("phone")}
                type="button"
              >
                <span className="auth-provider-icon" aria-hidden="true">
                  <svg fill="none" viewBox="0 0 24 24">
                    <path d="M8 4.5h8a1.5 1.5 0 0 1 1.5 1.5v12A1.5 1.5 0 0 1 16 19.5H8A1.5 1.5 0 0 1 6.5 18V6A1.5 1.5 0 0 1 8 4.5Z" />
                    <path d="M10.5 16.5h3" />
                  </svg>
                </span>
                <span>Continue with phone</span>
              </button>

              {authMethod === "phone" && (
                <button
                  className="auth-option-button"
                  disabled={authPending}
                  onClick={() => switchAuthMethod("email")}
                  type="button"
                >
                  <span className="auth-provider-icon" aria-hidden="true">
                    @
                  </span>
                  <span>Continue with email</span>
                </button>
              )}
            </div>

            <div className="auth-divider">
              <span>OR</span>
            </div>

            {authMethod === "phone" ? (
              <form className="auth-form" onSubmit={(event) => void handlePhoneSubmit(event)}>
                <input
                  className="auth-text-field"
                  disabled={authPending || authStep === "sms-code"}
                  inputMode="tel"
                  onChange={(event) => setAuthPhone(event.target.value)}
                  placeholder="+15555555555"
                  type="tel"
                  value={authPhone}
                />
                {authStep === "sms-code" && (
                  <input
                    className="auth-text-field"
                    disabled={authPending}
                    inputMode="numeric"
                    onChange={(event) => setAuthCode(event.target.value)}
                    placeholder="Verification code"
                    type="text"
                    value={authCode}
                  />
                )}
                <button
                  className="auth-submit-button"
                  disabled={authPending}
                  type="submit"
                >
                  {authPending
                    ? "Working..."
                    : authStep === "sms-code"
                      ? "Verify code"
                      : "Continue"}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={(event) => void handleEmailSubmit(event)}>
                <input
                  className="auth-text-field"
                  disabled={authPending}
                  inputMode="email"
                  onChange={(event) => setAuthEmail(event.target.value)}
                  placeholder="Email address"
                  type="email"
                  value={authEmail}
                />
                <button
                  className="auth-submit-button"
                  disabled={authPending}
                  type="submit"
                >
                  {authPending ? "Working..." : "Continue"}
                </button>
              </form>
            )}

            {authMessage && <p className="auth-modal-message">{authMessage}</p>}

            <p className="auth-mode-switch">
              {authModalMode === "signin"
                ? "New to ACRE?"
                : "Already have an account?"}
              <button
                disabled={authPending}
                onClick={() =>
                  openAuthModal(authModalMode === "signin" ? "signup" : "signin")
                }
                type="button"
              >
                {authModalMode === "signin" ? "Sign up" : "Log in"}
              </button>
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
