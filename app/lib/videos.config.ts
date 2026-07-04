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
  byline?: string;
  description?: string;
}

export const VIDEO_REGISTRY = {
  "exhibit-psd-live": {
    src: "https://assets.peytspencer.com/videos/exhibit-psd-live.mp4",
    title: "Exhibit PSD Live Performance",
    description: "Rocking the stage with my live band",
  },
  "boise-fund": {
    src: "https://assets.peytspencer.com/videos/boise-fund-60sec.mp4",
    title: "Flight to Boise Funding Campaign",
    description: "Opening for Mark Battles in Boise, Idaho",
  },
  "fund-next-single": {
    src: "https://assets.peytspencer.com/videos/fund-next-single-45sec.mp4",
    title: "Fund My Next Single",
    description: "Help fund my next Single",
  },
  "camp-oneness-true-happiness": {
    src: "https://assets.peytspencer.com/videos/camp-oneness-true-happiness.mp4",
    thumbnail: "https://assets.peytspencer.com/videos/camp-oneness-true-happiness-poster.jpg",
    title: "True Happiness",
    byline: "feat. Camp Oneness Choir",
    description: "The Camp Oneness Choir performing True Happiness in Virginia",
  },

  "concert-fulton-md": {
    src: "https://assets.peytspencer.com/videos/concert-fulton-md.mp4",
    thumbnail: "https://assets.peytspencer.com/videos/concert-fulton-md-cover.jpg",
    title: "Bringing people together",
  },
  "concert-so-gone-mexico": {
    src: "https://assets.peytspencer.com/videos/concert-so-gone-mexico-30sec.mp4",
    thumbnail: "https://assets.peytspencer.com/videos/concert-so-gone-mexico-30sec-poster.jpg",
    title: "Celebrating life's milestones",
  },
  "concert-ftgu-intro": {
    src: "https://assets.peytspencer.com/videos/concert-ftgu-intro-2-15sec.mp4",
    thumbnail: "/images/covers/intro-video-cover.jpg",
    title: "Uplifting every generation",
  },

  // Add more videos here as needed
  // Example:
  // "behind-the-scenes": {
  //   src: "https://assets.peytspencer.com/videos/bts.mp4",
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

// Per-leg intro video shown above the funnel, keyed by fund leg slug.
export const LEG_INTRO_VIDEOS: Record<string, VideoId> = {
  dmv: "camp-oneness-true-happiness",
};
