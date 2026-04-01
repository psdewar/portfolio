export const PATRON_CONFIG = {
  earlyAccess: {
    name: "Early Access",
    description: "Exclusive tracks, yours now",
    trackIds: ["so-good", "crg-freestyle", "safe", "right-one", "where-i-wanna-be"] as string[],
  },
};

export const TIER_ELEMENTS: Record<string, string> = {
  Pen: "Words That Paint the Art",
  Flow: "Rhythm That Moves the Art",
  Mind: "Ideas That Shape the Art",
  Soul: "Fire That Fuels the Art",
};

export const PATRON_EXCLUSIVE_TRACKS = new Set<string>(PATRON_CONFIG.earlyAccess.trackIds);

export function isPatronTrack(trackId: string): boolean {
  return PATRON_EXCLUSIVE_TRACKS.has(trackId);
}
