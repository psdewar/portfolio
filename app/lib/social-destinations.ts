export const SOCIAL_PLATFORMS = ["instagram", "facebook"] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_KINDS = ["public", "practice"] as const;
export type SocialKind = (typeof SOCIAL_KINDS)[number];

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
};

export const SOCIAL_TTL_MS: Record<SocialPlatform, number | null> = {
  instagram: 5 * 60 * 60 * 1000,
  facebook: null,
};

export const FACEBOOK_INGEST_URL = "rtmps://live-api-s.facebook.com:443/rtmp/";

const FACEBOOK_INPUT = /^(?:rtmps:\/\/live-api-s\.facebook\.com(?::443)?\/rtmp\/)?(FB-[A-Za-z0-9_-]+)$/;

export type SocialDestinationState = { savedAt: string; tail: string };

export function isSocialFresh(platform: SocialPlatform, savedAt: string, now = Date.now()) {
  const ttl = SOCIAL_TTL_MS[platform];
  return ttl === null || now - new Date(savedAt).getTime() < ttl;
}

export function parseSocialInput(
  platform: SocialPlatform,
  input: { url?: unknown; key?: unknown },
): { streamUrl: string; streamKey: string } {
  const key = String(input.key ?? "").trim();
  if (platform === "facebook") {
    const match = FACEBOOK_INPUT.exec(key);
    if (!match) throw new Error("Paste the stream key (FB-...) or the full ingest URL from Live Producer");
    return { streamUrl: FACEBOOK_INGEST_URL, streamKey: match[1] };
  }
  const url = String(input.url ?? "").trim();
  if (!/^rtmps?:\/\//.test(url)) throw new Error("Stream URL must start with rtmps://");
  if (!key) throw new Error("Stream key is required");
  return { streamUrl: url, streamKey: key };
}
