export const YOUTUBE_ACCOUNTS = ["main", "practice"] as const;
export type YouTubeAccount = (typeof YOUTUBE_ACCOUNTS)[number];
export type Privacy = "public" | "unlisted" | "private";

export const OAUTH_COOKIE = "yt-oauth";
const API = "https://www.googleapis.com/youtube/v3";
const UPLOAD = "https://www.googleapis.com/upload/youtube/v3";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/youtube";
export const STREAM_TITLES: Record<YouTubeAccount, string> = {
  main: "Portfolio relay",
  practice: "Portfolio rehearsal",
};

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

export function youtubeRedirectUri(request: Request): string {
  const url = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || url.host;
  return `${proto}://${host}/api/admin/youtube/callback`;
}

export function youtubeAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: env("GOOGLE_OAUTH_CLIENT_ID"),
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPE,
    access_type: "offline",
    prompt: "consent select_account",
    state,
  });
  return `${AUTH_URL}?${params}`;
}

async function tokenRequest(body: Record<string, string>): Promise<Record<string, string>> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env("GOOGLE_OAUTH_CLIENT_ID"),
      client_secret: env("GOOGLE_OAUTH_CLIENT_SECRET"),
      ...body,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token ${res.status}: ${data.error_description || data.error}`);
  return data;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const data = await tokenRequest({
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  if (!data.refresh_token) throw new Error("Google returned no refresh token");
  return { refreshToken: data.refresh_token, accessToken: data.access_token };
}

const accessTokens = new Map<string, { token: string; expires: number }>();

export function forgetAccessToken(refreshToken: string) {
  accessTokens.delete(refreshToken);
}

export async function accessToken(refreshToken: string): Promise<string> {
  const cached = accessTokens.get(refreshToken);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const data = await tokenRequest({ refresh_token: refreshToken, grant_type: "refresh_token" });
  accessTokens.set(refreshToken, {
    token: data.access_token,
    expires: Date.now() + Number(data.expires_in) * 1000,
  });
  return data.access_token;
}

async function yt(token: string, path: string, init: RequestInit = {}) {
  const hasJson = typeof init.body === "string";
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasJson ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`YouTube ${init.method || "GET"} ${path.split("?")[0]} ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

export async function fetchChannelTitle(token: string): Promise<string> {
  const data = await yt(token, "/channels?part=snippet&mine=true");
  const title = data.items?.[0]?.snippet?.title;
  if (!title) throw new Error("That Google account has no YouTube channel");
  return title;
}

export type LiveStream = { id: string; ingestUrl: string; streamName: string };

function toLiveStream(item: {
  id: string;
  cdn: { ingestionInfo: { rtmpsIngestionAddress: string; streamName: string } };
}): LiveStream {
  return {
    id: item.id,
    ingestUrl: item.cdn.ingestionInfo.rtmpsIngestionAddress,
    streamName: item.cdn.ingestionInfo.streamName,
  };
}

export async function ensureLiveStream(token: string, title: string): Promise<LiveStream> {
  const list = await yt(token, "/liveStreams?part=id,snippet,cdn&mine=true&maxResults=50");
  const existing = list.items?.find(
    (s: { snippet: { title: string }; cdn: { ingestionType: string } }) =>
      s.snippet.title === title && s.cdn.ingestionType === "rtmp",
  );
  if (existing) return toLiveStream(existing);
  const created = await yt(token, "/liveStreams?part=snippet,cdn,contentDetails", {
    method: "POST",
    body: JSON.stringify({
      snippet: { title },
      cdn: { ingestionType: "rtmp", resolution: "variable", frameRate: "variable" },
      contentDetails: { isReusable: true },
    }),
  });
  return toLiveStream(created);
}

export type BroadcastSpec = {
  title: string;
  description: string;
  privacy: Privacy;
  scheduledStart: string;
  embeddable: boolean;
  dvr: boolean;
  madeForKids: boolean;
};

export type Broadcast = {
  id: string;
  snippet: { scheduledStartTime: string; liveChatId?: string };
  status: { lifeCycleStatus: string };
  contentDetails: { boundStreamId?: string } & Record<string, unknown>;
};

export async function getBroadcast(token: string, id: string): Promise<Broadcast | undefined> {
  const data = await yt(token, `/liveBroadcasts?part=id,snippet,status,contentDetails&id=${id}`);
  return data.items?.[0];
}

export type ChatMessage = { id: string; ts: number; author: string; name: string; text: string };

export async function listChatMessages(token: string, liveChatId: string): Promise<ChatMessage[]> {
  const data = await yt(
    token,
    `/liveChat/messages?liveChatId=${encodeURIComponent(liveChatId)}&part=snippet,authorDetails&maxResults=200`,
  );
  return (data.items ?? [])
    .filter((item: { snippet: { type: string } }) => item.snippet.type === "textMessageEvent")
    .map(
      (item: {
        id: string;
        snippet: { publishedAt: string; displayMessage: string };
        authorDetails: { channelId: string; displayName: string };
      }) => ({
        id: item.id,
        ts: Date.parse(item.snippet.publishedAt),
        author: item.authorDetails.channelId,
        name: item.authorDetails.displayName,
        text: item.snippet.displayMessage,
      }),
    );
}

export function isBroadcastOpen(broadcast: Broadcast | undefined): broadcast is Broadcast {
  return !!broadcast && !["complete", "revoked"].includes(broadcast.status.lifeCycleStatus);
}

export async function insertBroadcast(token: string, spec: BroadcastSpec): Promise<string> {
  const created = await yt(token, "/liveBroadcasts?part=snippet,status,contentDetails", {
    method: "POST",
    body: JSON.stringify({
      snippet: {
        title: spec.title,
        description: spec.description,
        scheduledStartTime: spec.scheduledStart,
      },
      status: { privacyStatus: spec.privacy, selfDeclaredMadeForKids: spec.madeForKids },
      contentDetails: {
        enableAutoStart: true,
        enableAutoStop: true,
        latencyPreference: "low",
        enableEmbed: spec.embeddable,
        enableDvr: spec.dvr,
        monitorStream: { enableMonitorStream: false },
      },
    }),
  });
  return created.id;
}

export async function updateBroadcast(token: string, current: Broadcast, spec: BroadcastSpec) {
  const upcoming = ["created", "ready"].includes(current.status.lifeCycleStatus);
  const body: Record<string, unknown> = {
    id: current.id,
    snippet: {
      title: spec.title,
      description: spec.description,
      scheduledStartTime: upcoming ? spec.scheduledStart : current.snippet.scheduledStartTime,
    },
    status: { privacyStatus: spec.privacy, selfDeclaredMadeForKids: spec.madeForKids },
  };
  if (upcoming) {
    body.contentDetails = {
      ...current.contentDetails,
      enableAutoStart: true,
      enableAutoStop: true,
      latencyPreference: "low",
      enableEmbed: spec.embeddable,
      enableDvr: spec.dvr,
    };
  }
  await yt(token, `/liveBroadcasts?part=snippet,status${upcoming ? ",contentDetails" : ""}`, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

export async function bindBroadcast(token: string, id: string, streamId: string) {
  await yt(token, `/liveBroadcasts/bind?part=id,contentDetails&id=${id}&streamId=${streamId}`, {
    method: "POST",
  });
}

export async function deleteBroadcast(token: string, id: string) {
  await yt(token, `/liveBroadcasts?id=${id}`, { method: "DELETE" });
}

export async function setThumbnail(token: string, videoId: string, image: Blob, type: string) {
  const res = await fetch(`${UPLOAD}/thumbnails/set?videoId=${videoId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": type },
    body: image,
  });
  if (!res.ok) throw new Error(`YouTube thumbnails.set ${res.status}: ${await res.text()}`);
}
