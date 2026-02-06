/**
 * Patron Configuration
 *
 * Single source of truth for all patron-exclusive content.
 * Controls which tracks are patron-only.
 */

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

export const TIER_DESCRIPTIONS: Record<string, string> = {
  Pen: "Covers a month of distribution.",
  Flow: "Covers copyright registration for two releases a year.",
  Mind: "Covers mixing and mastering one track.",
  Soul: "Covers the entire infrastructure: shows, livestreams, and website.",
};

// All patron-exclusive track IDs
export const PATRON_EXCLUSIVE_TRACKS = new Set<string>(PATRON_CONFIG.earlyAccess.trackIds);

/**
 * Check if a track is patron-only
 */
export function isPatronTrack(trackId: string): boolean {
  return PATRON_EXCLUSIVE_TRACKS.has(trackId);
}

/**
 * Get all patron-exclusive track IDs
 */
export function getPatronTrackIds(): string[] {
  return Array.from(PATRON_EXCLUSIVE_TRACKS);
}
