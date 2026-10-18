import { TRACK_DATA, type TrackData } from "./tracks";

export const SUPPORTER_CONFIG = {
  earlyAccess: {
    name: "Early Access",
    description: "Exclusive tracks, yours now",
    trackIds: ["best-foot-forward", "crg-freestyle", "so-good", "see-this-through"] as string[],
  },
};

export const SUPPORTER_EXCLUSIVE_TRACKS = new Set<string>(SUPPORTER_CONFIG.earlyAccess.trackIds);

export function isSupporterTrack(trackId: string): boolean {
  return SUPPORTER_EXCLUSIVE_TRACKS.has(trackId);
}

export const EARLY_ACCESS_TRACKS = SUPPORTER_CONFIG.earlyAccess.trackIds
  .map((id) => TRACK_DATA.find((t) => t.id === id))
  .filter((t): t is NonNullable<typeof t> => !!t);

export interface TrackPreview {
  title: string;
  src: string;
  autoplay: boolean;
}

export function toTrackPreview(track: { id: string; title: string }): TrackPreview {
  return { title: track.title, src: `/audio/${track.id}-preview.mp3`, autoplay: false };
}

export const EARLY_ACCESS_PREVIEW: TrackPreview | null = EARLY_ACCESS_TRACKS[0]
  ? toTrackPreview(EARLY_ACCESS_TRACKS[0])
  : null;

export type SupporterTierName = "Pen" | "Flow" | "Mind" | "Soul";

export const SUPPORTER_TIER_BASE: { name: SupporterTierName; net: number; color: string }[] = [
  { name: "Pen", net: 10, color: "#f97316" },
  { name: "Flow", net: 20, color: "#f56542" },
  { name: "Mind", net: 50, color: "#f0566d" },
  { name: "Soul", net: 100, color: "#ec4899" },
];

export function tierForMonthlyNet(net: number): SupporterTierName {
  if (net < 15) return "Pen";
  if (net < 35) return "Flow";
  if (net < 75) return "Mind";
  return "Soul";
}

export function latestPublicTrack(): TrackData | null {
  const candidates = TRACK_DATA.filter(
    (t) => (t.source ?? "hosted") === "hosted" && !!t.releaseDate && !SUPPORTER_EXCLUSIVE_TRACKS.has(t.id),
  );
  return candidates.reduce<TrackData | null>(
    (latest, t) => (!latest || t.releaseDate! > latest.releaseDate! ? t : latest),
    null,
  );
}
