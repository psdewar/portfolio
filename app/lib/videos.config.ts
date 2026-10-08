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
} as const;

export type VideoId = keyof typeof VIDEO_REGISTRY;

export function getVideoMetadata(videoId: string): VideoMetadata | null {
  return VIDEO_REGISTRY[videoId as VideoId] || null;
}

export function isValidVideoId(videoId: string): videoId is VideoId {
  return videoId in VIDEO_REGISTRY;
}

export const LEG_INTRO_VIDEOS: Record<string, VideoId> = {
  dmv: "camp-oneness-true-happiness",
};

export const ENERGY_VIDEO_IDS: VideoId[] = [
  "concert-fulton-md",
  "concert-so-gone-mexico",
  "concert-ftgu-intro",
];

// Intro video on /rsvp (?intro=1 landings). Files live on the assets VPS in /var/www/assets/videos.
export const RSVP_INTRO = {
  id: "rsvp-intro",
  src: "https://assets.peytspencer.com/videos/rsvp-intro-v2.mp4",
  poster: "https://assets.peytspencer.com/videos/rsvp-intro-first-v2.jpg", // first video frame, shown before playback so there's no black flash
  captions: undefined as string | undefined, // optional .vtt URL (current cut has burned-in captions)
  aspect: "9 / 16",
  ogSocal: "https://assets.peytspencer.com/videos/rsvp-intro-og-socal.jpg", // link-preview frame for ?intro=1&utm_campaign=socal texts (1080x1920)
};
