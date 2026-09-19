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

export type PatronTierName = "Pen" | "Flow" | "Mind" | "Soul";

export const PATRON_TIER_BASE: { name: PatronTierName; net: number; color: string }[] = [
  { name: "Pen", net: 5, color: "#f97316" },
  { name: "Flow", net: 10, color: "#f56542" },
  { name: "Mind", net: 25, color: "#f0566d" },
  { name: "Soul", net: 50, color: "#ec4899" },
];

export function tierForMonthlyNet(net: number): PatronTierName {
  if (net < 10) return "Pen";
  if (net < 25) return "Flow";
  if (net < 50) return "Mind";
  return "Soul";
}
