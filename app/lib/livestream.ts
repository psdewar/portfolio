import { supabaseAdmin } from "../../lib/supabase-admin";
import { ADLIB_URL, getStreamStatus, type StreamPath } from "./live";
import {
  createLiveVideo,
  deleteLiveVideo,
  isLiveVideoOpen,
  updateLiveVideo,
  type FacebookPrivacy,
} from "./facebook";
import { notifySubscribers } from "./notify";
import {
  SOCIAL_KINDS,
  SOCIAL_LABELS,
  SOCIAL_PLATFORMS,
  isSocialFresh,
  type SocialDestinationState,
  type SocialKind,
  type SocialPlatform,
} from "./social-destinations";
import {
  accessToken,
  bindBroadcast,
  deleteBroadcast,
  getBroadcast,
  insertBroadcast,
  isBroadcastOpen,
  listChatMessages,
  setThumbnail,
  updateBroadcast,
  YOUTUBE_ACCOUNTS,
  type BroadcastSpec,
  type Privacy,
  type YouTubeAccount,
} from "./youtube";

const THUMBNAIL_BUCKET = "livestream";
export const THUMBNAIL_PATH = "next-stream";
export const THUMBNAIL_MAX_BYTES = 2 * 1024 * 1024;

const SETTINGS_COLUMNS =
  "title, description, privacy, thumbnail_path, thumbnail_type, notify_subscribers, embeddable, dvr, made_for_kids";
const ACCOUNT_COLUMNS =
  "account, channel_title, live_stream_id, ingest_url, stream_name, current_broadcast_id";

export type Settings = {
  title: string;
  description: string;
  privacy: Privacy;
  thumbnail_path: string | null;
  thumbnail_type: string | null;
  notify_subscribers: boolean;
  embeddable: boolean;
  dvr: boolean;
  made_for_kids: boolean;
};

type AccountRow = {
  account: YouTubeAccount;
  channel_title: string;
  live_stream_id: string | null;
  ingest_url: string | null;
  stream_name: string | null;
  current_broadcast_id: string | null;
};

async function getSettings(): Promise<Settings> {
  const { data, error } = await supabaseAdmin
    .from("livestream_settings")
    .select(SETTINGS_COLUMNS)
    .eq("id", 1)
    .single();
  if (error) throw error;
  return data as Settings;
}

async function getAccount(account: YouTubeAccount): Promise<AccountRow | null> {
  const { data, error } = await supabaseAdmin
    .from("youtube_accounts")
    .select(ACCOUNT_COLUMNS)
    .eq("account", account)
    .maybeSingle();
  if (error) throw error;
  return data as AccountRow | null;
}

async function getRefreshToken(): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("youtube_accounts")
    .select("refresh_token")
    .eq("account", "main")
    .single();
  if (error) throw error;
  return data.refresh_token;
}

function broadcastSpec(
  account: YouTubeAccount,
  settings: Settings,
  scheduledStart: string,
): BroadcastSpec {
  const isMain = account === "main";
  return {
    title: settings.title || "Live",
    description: isMain ? settings.description : "",
    privacy: isMain ? settings.privacy : "private",
    scheduledStart,
    embeddable: settings.embeddable,
    dvr: settings.dvr,
    madeForKids: settings.made_for_kids,
  };
}

async function applyThumbnail(token: string, broadcastId: string, settings: Settings) {
  if (!settings.thumbnail_path || !settings.thumbnail_type) return;
  const { data, error } = await supabaseAdmin.storage
    .from(THUMBNAIL_BUCKET)
    .download(settings.thumbnail_path);
  if (error) throw error;
  await setThumbnail(token, broadcastId, data, settings.thumbnail_type);
}

async function claimBroadcast(
  account: YouTubeAccount,
  previous: string | null,
  next: string,
): Promise<boolean> {
  const query = supabaseAdmin
    .from("youtube_accounts")
    .update({ current_broadcast_id: next, updated_at: new Date().toISOString() })
    .eq("account", account);
  const { data, error } = await (previous
    ? query.eq("current_broadcast_id", previous)
    : query.is("current_broadcast_id", null)
  ).select("account");
  if (error) throw error;
  return data.length > 0;
}

export async function syncBroadcast(
  account: YouTubeAccount,
  options: { update?: boolean; scheduledStart?: string | null; thumbnail?: boolean } = {},
): Promise<string> {
  const row = await getAccount(account);
  if (!row?.live_stream_id) throw new Error(`YouTube ${account} is not connected`);
  const settings = await getSettings();
  const token = await accessToken(await getRefreshToken());
  const now = new Date();
  const requested = options.scheduledStart ? new Date(options.scheduledStart) : null;
  const scheduledStart = (requested && requested > now ? requested : now).toISOString();
  const spec = broadcastSpec(account, settings, scheduledStart);

  const existing = row.current_broadcast_id
    ? await getBroadcast(token, row.current_broadcast_id)
    : undefined;

  if (isBroadcastOpen(existing)) {
    if (options.update) await updateBroadcast(token, existing, spec);
    if (existing.contentDetails.boundStreamId !== row.live_stream_id) {
      await bindBroadcast(token, existing.id, row.live_stream_id);
    }
    if (options.thumbnail && account === "main") await applyThumbnail(token, existing.id, settings);
    return existing.id;
  }

  const id = await insertBroadcast(token, spec);
  await bindBroadcast(token, id, row.live_stream_id);
  if (!(await claimBroadcast(account, row.current_broadcast_id, id))) {
    await deleteBroadcast(token, id);
    const winner = await getAccount(account);
    if (!winner?.current_broadcast_id) throw new Error(`YouTube ${account} broadcast claim failed`);
    return winner.current_broadcast_id;
  }
  if (account === "main") await applyThumbnail(token, id, settings);
  if (account === "practice" && row.current_broadcast_id) {
    await deleteBroadcast(token, row.current_broadcast_id).catch((e) =>
      logRelayError("delete previous rehearsal broadcast", e),
    );
  }
  return id;
}

async function notifyOnce(broadcastId: string) {
  const { data, error } = await supabaseAdmin
    .from("livestream_settings")
    .update({ notified_broadcast_id: broadcastId })
    .eq("id", 1)
    .eq("notify_subscribers", true)
    .or(`notified_broadcast_id.is.null,notified_broadcast_id.neq.${broadcastId}`)
    .select("id");
  if (error) throw error;
  if (data.length > 0) await notifySubscribers();
}

async function youtubeLine(path: StreamPath): Promise<string | null> {
  const account: YouTubeAccount = path === "live" ? "main" : "practice";
  const row = await getAccount(account);
  if (!row?.live_stream_id || !row.ingest_url || !row.stream_name) return null;
  try {
    const broadcastId = await syncBroadcast(account);
    if (path === "live") {
      await notifyOnce(broadcastId).catch((e) => logRelayError("notify", e));
    }
  } catch (e) {
    logRelayError(`youtube broadcast ${path}`, e);
  }
  return `${row.ingest_url}/${row.stream_name}`;
}

const CHAT_GONE = /liveChatEnded|liveChatNotFound|liveChatDisabled/;

async function saveChatId(account: YouTubeAccount, liveChatId: string | null, broadcastId: string | null) {
  const { error } = await supabaseAdmin
    .from("youtube_accounts")
    .update({ live_chat_id: liveChatId, chat_broadcast_id: broadcastId })
    .eq("account", account);
  if (error) throw error;
}

export async function syncYouTubeChat(path: StreamPath): Promise<number> {
  const account = path === "live" ? "main" : "practice";
  const { data, error } = await supabaseAdmin
    .from("youtube_accounts")
    .select("current_broadcast_id, live_chat_id, chat_broadcast_id")
    .eq("account", account)
    .maybeSingle();
  if (error) throw error;
  if (!data?.current_broadcast_id) return 0;
  const token = await accessToken(await getRefreshToken());
  let liveChatId = data.chat_broadcast_id === data.current_broadcast_id ? data.live_chat_id : null;
  if (!liveChatId) {
    const broadcast = await getBroadcast(token, data.current_broadcast_id);
    liveChatId = broadcast?.snippet.liveChatId ?? null;
    if (!isBroadcastOpen(broadcast) || !liveChatId) return 0;
    await saveChatId(account, liveChatId, data.current_broadcast_id);
  }
  let messages;
  try {
    messages = await listChatMessages(token, liveChatId);
  } catch (e) {
    if (e instanceof Error && CHAT_GONE.test(e.message)) {
      await saveChatId(account, null, null);
      return 0;
    }
    throw e;
  }
  if (messages.length === 0) return 0;
  const res = await fetch(`${ADLIB_URL}/adlib/ingest?room=${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.ADLIB_HOOK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source: "youtube", messages }),
  });
  if (!res.ok) throw new Error(`adlib ingest ${res.status}`);
  const body = await res.json();
  return body.inserted ?? 0;
}

async function socialLine(platform: SocialPlatform, path: StreamPath): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("social_destinations")
    .select("stream_url, stream_key, updated_at")
    .eq("platform", platform)
    .eq("kind", path === "live" ? "public" : "practice")
    .maybeSingle();
  if (error) throw error;
  if (!data || !isSocialFresh(platform, data.updated_at)) return null;
  return `${data.stream_url}${data.stream_key}`;
}

async function getFacebookToken(): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("facebook_account")
    .select("access_token, expires_at")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (!data || (data.expires_at && new Date(data.expires_at).getTime() <= Date.now())) return null;
  return data.access_token;
}

async function getFacebookVideo(kind: SocialKind) {
  const { data, error } = await supabaseAdmin
    .from("facebook_live_videos")
    .select("live_video_id, stream_url")
    .eq("kind", kind)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function claimFacebookVideo(
  kind: SocialKind,
  previous: string | null,
  next: { id: string; streamUrl: string },
): Promise<boolean> {
  const values = {
    live_video_id: next.id,
    stream_url: next.streamUrl,
    updated_at: new Date().toISOString(),
  };
  if (!previous) {
    const { error } = await supabaseAdmin.from("facebook_live_videos").insert({ kind, ...values });
    if (error?.code === "23505") return false;
    if (error) throw error;
    return true;
  }
  const { data, error } = await supabaseAdmin
    .from("facebook_live_videos")
    .update(values)
    .eq("kind", kind)
    .eq("live_video_id", previous)
    .select("kind");
  if (error) throw error;
  return data.length > 0;
}

async function facebookVideoLine(token: string, kind: SocialKind): Promise<string> {
  const row = await getFacebookVideo(kind);
  if (row) {
    try {
      if (await isLiveVideoOpen(token, row.live_video_id)) return row.stream_url;
    } catch (e) {
      logRelayError("facebook video status", e);
      return row.stream_url;
    }
  }

  const settings = await getSettings();
  const privacy: FacebookPrivacy = kind === "public" ? "EVERYONE" : "SELF";
  const video = await createLiveVideo(token, {
    title: settings.title || "Live",
    description: kind === "public" ? settings.description : "",
    privacy,
  });
  if (!(await claimFacebookVideo(kind, row?.live_video_id ?? null, video))) {
    await deleteLiveVideo(token, video.id);
    const winner = await getFacebookVideo(kind);
    if (!winner) throw new Error(`Facebook ${kind} video claim failed`);
    return winner.stream_url;
  }
  if (kind === "practice" && row) {
    await deleteLiveVideo(token, row.live_video_id).catch((e) =>
      logRelayError("delete previous facebook rehearsal video", e),
    );
  }
  return video.streamUrl;
}

async function facebookLine(path: StreamPath): Promise<string | null> {
  const kind: SocialKind = path === "live" ? "public" : "practice";
  const token = await getFacebookToken();
  if (!token) return socialLine("facebook", path);
  try {
    return await facebookVideoLine(token, kind);
  } catch (e) {
    logRelayError(`facebook video ${path}`, e);
    return socialLine("facebook", path);
  }
}

export async function syncFacebookVideos() {
  const token = await getFacebookToken();
  if (!token) return;
  const settings = await getSettings();
  const { data, error } = await supabaseAdmin
    .from("facebook_live_videos")
    .select("kind, live_video_id");
  if (error) throw error;
  await Promise.all(
    data.map(async (row) => {
      try {
        if (!(await isLiveVideoOpen(token, row.live_video_id))) return;
        await updateLiveVideo(token, row.live_video_id, {
          title: settings.title || "Live",
          description: row.kind === "public" ? settings.description : "",
        });
      } catch (e) {
        logRelayError(`update facebook ${row.kind} video`, e);
      }
    }),
  );
}

export function logRelayError(label: string, error: unknown) {
  const text = error instanceof Error ? error.message : String(error);
  console.error(`[relay] ${label}:`, text.replace(/rtmps?:\/\/\S*/g, "[rtmp]"));
}

export async function relayLines(path: StreamPath): Promise<string[]> {
  const labels = ["youtube", ...SOCIAL_PLATFORMS].map((name) => `${name} ${path}`);
  const results = await Promise.allSettled([
    youtubeLine(path),
    ...SOCIAL_PLATFORMS.map((platform) =>
      platform === "facebook" ? facebookLine(path) : socialLine(platform, path),
    ),
  ]);
  return results.flatMap((result, i) => {
    if (result.status === "rejected") {
      logRelayError(labels[i], result.reason);
      return [];
    }
    return result.value ? [result.value] : [];
  });
}

export async function getAdminState() {
  const [settings, accounts, social, facebookAccount, live, rehearsal] = await Promise.all([
    getSettings(),
    supabaseAdmin.from("youtube_accounts").select("account, channel_title"),
    supabaseAdmin.from("social_destinations").select("platform, kind, stream_key, updated_at"),
    supabaseAdmin.from("facebook_account").select("user_name, expires_at").eq("id", 1).maybeSingle(),
    getStreamStatus("live"),
    getStreamStatus("rehearsal"),
  ]);
  if (accounts.error) throw accounts.error;
  if (social.error) throw social.error;
  if (facebookAccount.error) throw facebookAccount.error;

  const facebook =
    facebookAccount.data &&
    (!facebookAccount.data.expires_at || new Date(facebookAccount.data.expires_at).getTime() > Date.now())
      ? { userName: facebookAccount.data.user_name, expiresAt: facebookAccount.data.expires_at }
      : null;

  const channels = Object.fromEntries(
    YOUTUBE_ACCOUNTS.map((a) => [
      a,
      accounts.data.find((row) => row.account === a)?.channel_title ?? null,
    ]),
  ) as Record<YouTubeAccount, string | null>;
  const destinations = Object.fromEntries(
    SOCIAL_PLATFORMS.map((platform) => [
      platform,
      Object.fromEntries(
        SOCIAL_KINDS.map((kind) => {
          const row = social.data.find((r) => r.platform === platform && r.kind === kind);
          const state: SocialDestinationState | null = row
            ? { savedAt: row.updated_at, tail: row.stream_key.slice(-4) }
            : null;
          return [kind, state];
        }),
      ),
    ]),
  ) as Record<SocialPlatform, Record<SocialKind, SocialDestinationState | null>>;

  const plan = (account: YouTubeAccount, kind: SocialKind) => [
    ...(channels[account] ? ["YouTube"] : []),
    ...SOCIAL_PLATFORMS.filter((platform) => {
      const saved = destinations[platform][kind];
      return saved && isSocialFresh(platform, saved.savedAt);
    }).map((platform) => SOCIAL_LABELS[platform]),
  ];

  let thumbnailUrl: string | null = null;
  if (settings.thumbnail_path) {
    const signed = await supabaseAdmin.storage
      .from(THUMBNAIL_BUCKET)
      .createSignedUrl(settings.thumbnail_path, 3600);
    if (signed.error) throw signed.error;
    thumbnailUrl = signed.data.signedUrl;
  }

  return {
    settings: {
      title: settings.title,
      description: settings.description,
      privacy: settings.privacy,
      notify: settings.notify_subscribers,
      embeddable: settings.embeddable,
      dvr: settings.dvr,
      madeForKids: settings.made_for_kids,
      thumbnailUrl,
    },
    channels,
    destinations,
    facebook,
    status: {
      live: { receiving: live.live, relaysTo: plan("main", "public") },
      rehearsal: { receiving: rehearsal.live, relaysTo: plan("practice", "practice") },
    },
  };
}

export type AdminState = Awaited<ReturnType<typeof getAdminState>>;
