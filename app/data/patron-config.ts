import { TRACK_DATA } from "./tracks";

export const PATRON_CONFIG = {
  earlyAccess: {
    name: "Early Access",
    description: "Exclusive tracks, yours now",
    trackIds: ["crg-freestyle", "so-good", "best-foot-forward"] as string[],
  },
};

export const PATRON_EXCLUSIVE_TRACKS = new Set<string>(PATRON_CONFIG.earlyAccess.trackIds);

export function isPatronTrack(trackId: string): boolean {
  return PATRON_EXCLUSIVE_TRACKS.has(trackId);
}

export const EARLY_ACCESS_TRACKS = PATRON_CONFIG.earlyAccess.trackIds
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

export type PatronTierName = "Pen" | "Flow" | "Mind" | "Soul";

export const PATRON_TIER_BASE: { name: PatronTierName; net: number; color: string }[] = [
  { name: "Pen", net: 10, color: "#f97316" },
  { name: "Flow", net: 20, color: "#f56542" },
  { name: "Mind", net: 50, color: "#f0566d" },
  { name: "Soul", net: 100, color: "#ec4899" },
];

export function tierForMonthlyNet(net: number): PatronTierName {
  if (net < 15) return "Pen";
  if (net < 35) return "Flow";
  if (net < 75) return "Mind";
  return "Soul";
}
