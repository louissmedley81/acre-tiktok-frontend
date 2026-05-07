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

type TikTokRecentTotals = {
  commentCount?: number | null;
  likeCount?: number | null;
  shareCount?: number | null;
  viewCount?: number | null;
};

type TikTokVideoSnapshot = {
  caption?: string | null;
  commentCount?: number | null;
  coverImageUrl?: string | null;
  createdAt?: string | null;
  durationSeconds?: number | null;
  hashtags?: string[];
  id?: string | null;
  likeCount?: number | null;
  shareCount?: number | null;
  shareUrl?: string | null;
  title?: string | null;
  viewCount?: number | null;
};

type TikTokConnectionSnapshot = {
  cursor?: number | null;
  hasMore?: boolean | null;
  recentTotals?: TikTokRecentTotals;
  syncedAt?: string | null;
  syncWarnings?: string[];
  topHashtags?: string[];
  videos?: TikTokVideoSnapshot[];
};

type ConnectionProfile = {
  bioDescription?: string | null;
  followerCount?: number | null;
  followingCount?: number | null;
  handle?: string | null;
  id?: string | null;
  imageUrl?: string | null;
  isVerified?: boolean | null;
  likesCount?: number | null;
  name?: string | null;
  profileDeepLink?: string | null;
  snapshot?: TikTokConnectionSnapshot;
  username?: string | null;
  videoCount?: number | null;
};

type ConnectionState = {
  connectedAt?: string | null;
  profile?: ConnectionProfile;
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
    summary: "Connect TikTok and X so ACRE can sync saved channel data into your creator profile.",
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

function getOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getOptionalBoolean(value: unknown) {
  return typeof value === "boolean" ? value : null;
}

function getOptionalStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => getOptionalString(item))
    .filter((item): item is string => Boolean(item));
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

  const snapshotValue = isRecord(value.snapshot) ? value.snapshot : null;
  const recentTotalsValue =
    snapshotValue && isRecord(snapshotValue.recentTotals)
      ? snapshotValue.recentTotals
      : null;

  const videos =
    snapshotValue && Array.isArray(snapshotValue.videos)
      ? snapshotValue.videos
          .map((video) => {
            if (!isRecord(video)) {
              return null;
            }

            const parsedVideo: TikTokVideoSnapshot = {
              caption: getOptionalString(video.caption),
              commentCount: getOptionalNumber(video.commentCount),
              coverImageUrl: getOptionalString(video.coverImageUrl),
              createdAt: getOptionalString(video.createdAt),
              durationSeconds: getOptionalNumber(video.durationSeconds),
              hashtags: getOptionalStringArray(video.hashtags),
              id: getOptionalString(video.id),
              likeCount: getOptionalNumber(video.likeCount),
              shareCount: getOptionalNumber(video.shareCount),
              shareUrl: getOptionalString(video.shareUrl),
              title: getOptionalString(video.title),
              viewCount: getOptionalNumber(video.viewCount),
            };

            return Object.values(parsedVideo).some((entry) =>
              Array.isArray(entry) ? entry.length > 0 : entry !== null,
            )
              ? parsedVideo
              : null;
          })
          .filter((video): video is TikTokVideoSnapshot => video !== null)
      : [];

  const snapshot = snapshotValue
    ? {
        cursor: getOptionalNumber(snapshotValue.cursor),
        hasMore: getOptionalBoolean(snapshotValue.hasMore),
        recentTotals: recentTotalsValue
          ? {
              commentCount: getOptionalNumber(recentTotalsValue.commentCount),
              likeCount: getOptionalNumber(recentTotalsValue.likeCount),
              shareCount: getOptionalNumber(recentTotalsValue.shareCount),
              viewCount: getOptionalNumber(recentTotalsValue.viewCount),
            }
          : undefined,
        syncedAt: getOptionalString(snapshotValue.syncedAt),
        syncWarnings: getOptionalStringArray(snapshotValue.syncWarnings),
        topHashtags: getOptionalStringArray(snapshotValue.topHashtags),
        videos,
      }
    : undefined;

  const profile = {
    bioDescription: getOptionalString(value.bioDescription),
    followerCount: getOptionalNumber(value.followerCount),
    followingCount: getOptionalNumber(value.followingCount),
    handle: getOptionalString(value.handle),
    id: getOptionalString(value.id),
    imageUrl: getOptionalString(value.imageUrl),
    isVerified: getOptionalBoolean(value.isVerified),
    likesCount: getOptionalNumber(value.likesCount),
    name: getOptionalString(value.name),
    profileDeepLink: getOptionalString(value.profileDeepLink),
    snapshot,
    username: getOptionalString(value.username),
    videoCount: getOptionalNumber(value.videoCount),
  };

  return Object.values(profile).some((entry) => {
    if (Array.isArray(entry)) {
      return entry.length > 0;
    }

    if (isRecord(entry)) {
      return Object.values(entry).some((nestedValue) =>
        Array.isArray(nestedValue) ? nestedValue.length > 0 : nestedValue !== null,
      );
    }

    return entry !== null && entry !== undefined;
  })
    ? profile
    : undefined;
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

  if (!Array.isArray(value)) {
    return fallback;
  }

  for (const row of value) {
    if (!isRecord(row)) {
      continue;
    }

    const provider =
      row.provider === "tiktok" || row.provider === "x"
        ? row.provider
        : null;

    if (!provider || fallback[provider].status === "connected") {
      continue;
    }

    const connectedAt = getOptionalString(row.connected_at);
    const status = getConnectionStatus(row.status);
    const profile = parseConnectionProfile(row.profile);

    fallback[provider] = {
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
  }

  return fallback;
}

function formatCompactNumber(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 1000 ? 1 : 0,
    notation: value >= 1000 ? "compact" : "standard",
  }).format(value);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Waiting for first sync";
  }

  const timestamp = Date.parse(value);

  if (Number.isNaN(timestamp)) {
    return "Waiting for first sync";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

function shouldRefreshTikTokSnapshot(connection: ConnectionState) {
  if (connection.status !== "connected") {
    return false;
  }

  const syncedAt = connection.profile?.snapshot?.syncedAt;

  if (!syncedAt) {
    return true;
  }

  const timestamp = Date.parse(syncedAt);

  if (Number.isNaN(timestamp)) {
    return true;
  }

  return Date.now() - timestamp >= 1000 * 60 * 30;
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
  const [connectionRefreshKey, setConnectionRefreshKey] = useState(0);
  const [lastTikTokSyncRequestKey, setLastTikTokSyncRequestKey] = useState<string | null>(
    null,
  );
  const [tiktokSyncError, setTikTokSyncError] = useState<string | null>(null);
  const [tiktokSyncState, setTikTokSyncState] = useState<
    "error" | "idle" | "loading" | "success"
  >("idle");
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
      if (!cancelled) {
        setConnections(markConnectionsLoading);
      }

      try {
        const { data, error } = await supabaseClient
          .from("social_connections")
          .select(
            "connected_at,profile,provider,provider_handle,provider_image_url,provider_name,provider_user_id,status",
          )
          .in("provider", ["tiktok", "x"])
          .order("connected_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (!cancelled) {
          setConnections((current) =>
            mergeFetchedConnections(current, parsePersistedConnections(data)),
          );
        }
      } catch (error) {
        console.error("Unable to load saved provider connections from Supabase", error);

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
  }, [connectionRefreshKey, supabase, viewer?.id]);

  useEffect(() => {
    if (!supabase || !viewer?.id || !shouldRefreshTikTokSnapshot(connections.tiktok)) {
      return;
    }

    const syncKey = `${viewer.id}:${connections.tiktok.connectedAt ?? "connected"}:${
      connections.tiktok.profile?.snapshot?.syncedAt ?? "unsynced"
    }`;

    if (lastTikTokSyncRequestKey === syncKey) {
      return;
    }

    let cancelled = false;
    const supabaseClient = supabase;

    async function syncTikTokSnapshot() {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        return;
      }

      setLastTikTokSyncRequestKey(syncKey);
      setTikTokSyncError(null);
      setTikTokSyncState("loading");

      try {
        const response = await fetch(`${backendBaseUrl}/api/tiktok-me`, {
          cache: "no-store",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const json: unknown = await response.json().catch(() => ({
          error: "TikTok sync returned a non-JSON response.",
        }));

        if (!response.ok) {
          const message =
            isRecord(json) && typeof json.error === "string"
              ? json.error
              : "Unable to sync TikTok data into Supabase.";
          throw new Error(message);
        }

        if (!cancelled) {
          setTikTokSyncState("success");
          setConnectionRefreshKey((current) => current + 1);
        }
      } catch (error) {
        console.error("Unable to sync TikTok data", error);

        if (!cancelled) {
          setTikTokSyncState("error");
          setTikTokSyncError(
            error instanceof Error
              ? error.message
              : "Unable to sync TikTok data into Supabase.",
          );
        }
      }
    }

    void syncTikTokSnapshot();

    return () => {
      cancelled = true;
    };
  }, [
    backendBaseUrl,
    connections.tiktok,
    lastTikTokSyncRequestKey,
    supabase,
    viewer?.id,
  ]);

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
    setConnectionRefreshKey(0);
    setLastTikTokSyncRequestKey(null);
    setTikTokSyncError(null);
    setTikTokSyncState("idle");
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
  const tiktokProfile = connections.tiktok.profile;
  const tiktokSnapshot = tiktokProfile?.snapshot;
  const tiktokVideos = Array.isArray(tiktokSnapshot?.videos) ? tiktokSnapshot.videos : [];
  const tiktokRecentTotals = tiktokSnapshot?.recentTotals;
  const tiktokTopHashtags = Array.isArray(tiktokSnapshot?.topHashtags)
    ? tiktokSnapshot.topHashtags
    : [];
  const tiktokSyncWarnings = Array.isArray(tiktokSnapshot?.syncWarnings)
    ? tiktokSnapshot.syncWarnings
    : [];
  const hasTikTokConnection = connections.tiktok.status === "connected" && Boolean(tiktokProfile);
  const hasTikTokSnapshot = hasTikTokConnection && Boolean(tiktokSnapshot);
  const tiktokHandle = tiktokProfile?.handle ?? tiktokProfile?.username ?? null;
  const recentEngagementRate =
    tiktokRecentTotals?.viewCount && tiktokRecentTotals.viewCount > 0
      ? (((tiktokRecentTotals.likeCount ?? 0) +
          (tiktokRecentTotals.commentCount ?? 0) +
          (tiktokRecentTotals.shareCount ?? 0)) /
          tiktokRecentTotals.viewCount) *
        100
      : null;
  const dashboardStats = hasTikTokConnection
    ? [
        {
          label: "TikTok Followers",
          note: tiktokProfile?.isVerified
            ? "Verified TikTok account"
            : "Follower count from your connected profile",
          value: formatCompactNumber(tiktokProfile?.followerCount),
        },
        {
          label: "Lifetime Likes",
          note: tiktokHandle
            ? `Saved from @${tiktokHandle}`
            : "Saved from your connected TikTok profile",
          value: formatCompactNumber(tiktokProfile?.likesCount),
        },
        {
          label: "Recent Video Views",
          note: hasTikTokSnapshot
            ? `${tiktokVideos.length} videos saved into Supabase`
            : "Run the TikTok sync once to pull recent posts",
          value: formatCompactNumber(tiktokRecentTotals?.viewCount),
        },
        {
          label: "Recent Engagement",
          note: tiktokTopHashtags.length
            ? `Top tag ${tiktokTopHashtags[0]}`
            : "Hashtags are parsed from synced TikTok captions",
          value:
            typeof recentEngagementRate === "number" && Number.isFinite(recentEngagementRate)
              ? `${recentEngagementRate.toFixed(1)}%`
              : "—",
        },
      ]
    : performanceStats;
  const chartVideos = [...tiktokVideos]
    .sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return leftTime - rightTime;
    })
    .slice(-8);
  const maxChartViews = chartVideos.reduce((highest, video) => {
    const views = typeof video.viewCount === "number" ? video.viewCount : 0;
    return views > highest ? views : highest;
  }, 0);
  const recentVideoRows = [...tiktokVideos]
    .sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    })
    .slice(0, 4);
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
              through the hardened backend callback flow, with TikTok snapshots
              being saved back into Supabase for the dashboard.
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
              <li>TikTok performance snapshots are now stored in Supabase after each sync.</li>
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
            TikTok profile metrics, recent videos, and parsed hashtags are saved into
            Supabase and rendered here from that stored snapshot.
          </p>
        </div>

        {tiktokSyncState === "loading" && (
          <div className="inline-note">
            Refreshing your TikTok snapshot and saving the latest videos, hashtags,
            and stats into Supabase now.
          </div>
        )}
        {tiktokSyncError && (
          <div className="inline-note inline-note-error">{tiktokSyncError}</div>
        )}
        {tiktokSyncWarnings.length > 0 && (
          <div className="inline-note">{tiktokSyncWarnings.join(" ")}</div>
        )}

        <div className="stats-grid">
          {dashboardStats.map((stat) => (
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
                <h4>{chartVideos.length > 0 ? "Recent TikTok video views" : "TikTok sync status"}</h4>
                <span className="status-pill mono">
                  {hasTikTokSnapshot ? "supabase snapshot" : "awaiting TikTok data"}
                </span>
              </div>
              {chartVideos.length > 0 ? (
                <div className="chart-bars" aria-hidden="true">
                  {chartVideos.map((video, index) => {
                    const views = typeof video.viewCount === "number" ? video.viewCount : 0;
                    const height = maxChartViews > 0 ? Math.max(18, (views / maxChartViews) * 100) : 18;
                    const label = video.title ?? video.caption ?? `TikTok video ${index + 1}`;

                    return (
                      <span
                        key={video.id ?? `${label}-${index}`}
                        className="chart-bar"
                        style={{ height: `${height}%` }}
                        title={`${label}: ${formatCompactNumber(views)} views`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="empty-panel">
                  <p>
                    {hasTikTokConnection
                      ? "TikTok is connected. ACRE is waiting for the first saved video snapshot to land in Supabase."
                      : "Connect TikTok from Link Channels and ACRE will pull recent videos, hashtags, and metrics into this dashboard."}
                  </p>
                </div>
              )}
            </div>

            <div className="feed-card">
              <h4>{recentVideoRows.length > 0 ? "Recent TikTok videos" : "Recent posts"}</h4>
              {recentVideoRows.length > 0
                ? recentVideoRows.map((video, index) => {
                    const title = video.title ?? video.caption ?? `TikTok video ${index + 1}`;
                    const views = formatCompactNumber(video.viewCount);
                    const engagement = formatCompactNumber(
                      (video.likeCount ?? 0) +
                        (video.commentCount ?? 0) +
                        (video.shareCount ?? 0),
                    );

                    return (
                      <div key={video.id ?? `${title}-${index}`} className="feed-row">
                        <div>
                          <strong>{title}</strong>
                          <p>
                            {views} views
                            {video.createdAt ? ` • ${formatDateTime(video.createdAt)}` : ""}
                          </p>
                        </div>
                        <span>{engagement} engagements</span>
                      </div>
                    );
                  })
                : recentPosts.map(([title, views, earnings]) => (
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
            <h4>{hasTikTokConnection ? "TikTok profile snapshot" : "Earnings and payouts"}</h4>
            {hasTikTokConnection ? (
              <>
                <div className="balance-card profile-summary-card">
                  <span className="metric-label mono">Connected account</span>
                  <strong>
                    {tiktokHandle ? `@${tiktokHandle}` : tiktokProfile?.name ?? "TikTok connected"}
                  </strong>
                  <p>
                    {tiktokProfile?.bioDescription ??
                      "ACRE reads your TikTok data through the API, stores the snapshot in Supabase, and renders it here without relying on backend storage."}
                  </p>
                </div>

                <div className="feed-card">
                  <div className="feed-row">
                    <div>
                      <strong>Display name</strong>
                      <p>{tiktokProfile?.name ?? "TikTok creator"}</p>
                    </div>
                    <span>{tiktokProfile?.isVerified ? "Verified" : "Standard"}</span>
                  </div>
                  <div className="feed-row">
                    <div>
                      <strong>Following</strong>
                      <p>Accounts this TikTok profile follows</p>
                    </div>
                    <span>{formatCompactNumber(tiktokProfile?.followingCount)}</span>
                  </div>
                  <div className="feed-row">
                    <div>
                      <strong>Videos on profile</strong>
                      <p>Total video count reported by TikTok</p>
                    </div>
                    <span>{formatCompactNumber(tiktokProfile?.videoCount)}</span>
                  </div>
                  <div className="feed-row">
                    <div>
                      <strong>Last sync</strong>
                      <p>Snapshot stored in Supabase</p>
                    </div>
                    <span>{formatDateTime(tiktokSnapshot?.syncedAt)}</span>
                  </div>
                </div>

                {tiktokTopHashtags.length > 0 ? (
                  <div className="tag-list">
                    {tiktokTopHashtags.map((hashtag) => (
                      <span key={hashtag} className="tag-pill mono">
                        {hashtag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="inline-note">
                    Hashtags will appear here once TikTok captions have been synced into Supabase.
                  </div>
                )}
              </>
            ) : (
              <>
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
              </>
            )}
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
                  <svg viewBox="0 0 24 24">
                    <path
                      d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.31 2.98-7.52Z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 22c2.7 0 4.96-.9 6.62-2.44l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A9.99 9.99 0 0 0 12 22Z"
                      fill="#34A853"
                    />
                    <path
                      d="M6.41 13.88A6.01 6.01 0 0 1 6.1 12c0-.65.11-1.28.31-1.88V7.53H3.07A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.07 4.47l3.34-2.59Z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.99c1.47 0 2.79.5 3.82 1.5l2.87-2.87C16.96 3.01 14.7 2 12 2a9.99 9.99 0 0 0-8.93 5.53l3.34 2.59C7.2 7.75 9.4 5.99 12 5.99Z"
                      fill="#EA4335"
                    />
                  </svg>
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
