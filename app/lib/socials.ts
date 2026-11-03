export type SocialTarget = "instagram" | "spotify" | "apple_music" | "youtube";

export const SPOTIFY_URL = "https://open.spotify.com/artist/2i77XjQtnVre1eS46M2ZlN";
export const INSTAGRAM_URL = "https://instagram.com/peytspencer";
export const YOUTUBE_URL = "https://youtube.com/@peytspencer";
export const APPLE_MUSIC_URL = "https://music.apple.com/us/artist/peyt-spencer/1361786209";

export const CHECKIN_SOCIALS: Record<SocialTarget, string> = {
  instagram: INSTAGRAM_URL,
  spotify: SPOTIFY_URL,
  youtube: `${YOUTUBE_URL}?sub_confirmation=1`,
  apple_music: APPLE_MUSIC_URL,
};
export const FEATURE_LINK = { href: "https://soundbetter.com/profiles/630479-peyt-spencer", label: "Book a guest verse", color: "#a05f7e" };
