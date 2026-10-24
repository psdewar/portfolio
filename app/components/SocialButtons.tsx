"use client";

import "./SocialButtons.css";
import { AppleMusicGlyph, InstagramGlyph, SpotifyGlyph, YouTubeGlyph } from "../checkin/BrandGlyphs";
import { APPLE_MUSIC_URL, SOCIAL_LINKS } from "./Social";

export type SocialTarget = "instagram" | "spotify" | "apple_music" | "youtube";

const link = (label: string) => SOCIAL_LINKS.find((l) => l.label === label)!.href;
const instagramUrl = link("Instagram");
const youtubeUrl = `${link("YouTube")}?sub_confirmation=1`;

export default function SocialButtons({
  showAppleMusic,
  onTap,
}: {
  showAppleMusic: boolean;
  onTap: (target: SocialTarget) => void;
}) {
  const btn = (target: SocialTarget, className: string, href: string, name: string, lead: string, icon: React.ReactNode) => (
    <a
      className={`soc-btn ${className}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${lead} ${name}`}
      onClick={() => onTap(target)}
    >
      {icon}
      <span className="tx">
        <span>{lead}</span>
        <b>{name}</b>
      </span>
    </a>
  );

  return (
    <div className="soc">
      <svg width="0" height="0" aria-hidden="true" focusable="false" style={{ position: "absolute" }}>
        <linearGradient id="ig-glyph" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#FEDA75" />
          <stop offset="0.25" stopColor="#FA7E1E" />
          <stop offset="0.5" stopColor="#D62976" />
          <stop offset="0.75" stopColor="#962FBF" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </svg>
      <div className="soc-row">
        {btn("instagram", "ig", instagramUrl, "Instagram", "Follow me on", <InstagramGlyph />)}
        {btn("spotify", "sp", link("Spotify"), "Spotify", "Follow me on", <SpotifyGlyph />)}
        {btn("youtube", "yt", youtubeUrl, "YouTube", "Subscribe on", <YouTubeGlyph />)}
        {showAppleMusic && btn("apple_music", "am", APPLE_MUSIC_URL, "Apple Music", "Favorite me on", <AppleMusicGlyph />)}
      </div>
    </div>
  );
}
