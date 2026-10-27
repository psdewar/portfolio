"use client";

import "./SocialButtons.css";
import { AppleMusicGlyph, IgGradient, InstagramGlyph, SpotifyGlyph, YouTubeGlyph } from "../checkin/BrandGlyphs";
import { CHECKIN_SOCIALS, type SocialTarget } from "../lib/socials";

export type { SocialTarget };

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
      <IgGradient />
      <div className="soc-row">
        {btn("instagram", "ig", CHECKIN_SOCIALS.instagram, "Instagram", "Follow me on", <InstagramGlyph />)}
        {btn("spotify", "sp", CHECKIN_SOCIALS.spotify, "Spotify", "Follow me on", <SpotifyGlyph />)}
        {btn("youtube", "yt", CHECKIN_SOCIALS.youtube, "YouTube", "Subscribe on", <YouTubeGlyph />)}
        {showAppleMusic && btn("apple_music", "am", CHECKIN_SOCIALS.apple_music, "Apple Music", "Favorite me on", <AppleMusicGlyph />)}
      </div>
    </div>
  );
}
