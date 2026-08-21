export const PATRON_CONFIG = {
  earlyAccess: {
    name: "Early Access",
    description: "Exclusive tracks, yours now",
    trackIds: ["crg-freestyle", "so-good"] as string[],
  },
};

export const PATRON_EXCLUSIVE_TRACKS = new Set<string>(PATRON_CONFIG.earlyAccess.trackIds);

export function isPatronTrack(trackId: string): boolean {
  return PATRON_EXCLUSIVE_TRACKS.has(trackId);
}
