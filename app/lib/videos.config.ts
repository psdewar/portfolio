/**
 * Centralized video registry for the portfolio site.
 * All videos should be registered here to enable:
 * - Deep linking (e.g., ?video=exhibit-psd-live)
 * - Video reuse across pages
 * - Consistent metadata management
 * - Type-safe video IDs
 */

export interface VideoMetadata {
  src: string;
  instagramUrl?: string;
  thumbnail?: string;
  title?: string;
  description?: string;
}

export const VIDEO_REGISTRY = {
  "exhibit-psd-live": {
    src: "/exhibit-psd-live.mp4",
    title: "Exhibit PSD Live Performance",
    description: "Rocking the stage with my live band",
  },
  "boise-fund": {
    src: "/boise-fund-60sec.mp4",
    title: "Flight to Boise Funding Campaign",
    description: "Opening for Mark Battles in Boise, Idaho",
  },
  "fund-next-single": {
    src: "/fund-next-single-45sec.mp4",
    title: "Fund My Next Single",
    description: "Help fund my next single release",
  },

  // Add more videos here as needed
  // Example:
  // "behind-the-scenes": {
  //   src: "/videos/bts.mp4",
  //   instagramUrl: "https://instagram.com/p/...",
  //   thumbnail: "/thumbnails/bts.jpg",
  //   title: "Behind the Scenes",
  // },
} as const;

// Export type-safe video IDs
export type VideoId = keyof typeof VIDEO_REGISTRY;

// Helper to get video metadata by ID
export function getVideoMetadata(videoId: string): VideoMetadata | null {
  return VIDEO_REGISTRY[videoId as VideoId] || null;
}

// Helper to check if a video ID exists
export function isValidVideoId(videoId: string): videoId is VideoId {
  return videoId in VIDEO_REGISTRY;
}
