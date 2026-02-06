import {
  InstagramLogoIcon,
  TiktokLogoIcon,
  YoutubeLogoIcon,
  TwitterLogoIcon,
  FacebookLogoIcon,
  SpotifyLogoIcon,
  type Icon,
} from "@phosphor-icons/react";

const LINKS: { href: string; label: string; icon: Icon }[] = [
  { href: "https://open.spotify.com/artist/2i77XjQtnVre1eS46M2ZlN", label: "Spotify", icon: SpotifyLogoIcon },
  { href: "https://instagram.com/peytspencer", label: "Instagram", icon: InstagramLogoIcon },
  { href: "https://tiktok.com/@peytspencer", label: "TikTok", icon: TiktokLogoIcon },
  { href: "https://youtube.com/@peytspencer", label: "YouTube", icon: YoutubeLogoIcon },
  { href: "https://twitter.com/peytspencer", label: "Twitter", icon: TwitterLogoIcon },
  { href: "https://facebook.com/9psd2", label: "Facebook", icon: FacebookLogoIcon },
];

interface SocialProps {
  isMobilePanel?: boolean;
  isHorizontal?: boolean;
}

export function Social({ isMobilePanel = false, isHorizontal = false }: SocialProps) {
  const iconClasses = `${
    isMobilePanel || isHorizontal
      ? "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      : "text-white hover:text-[#FFFFFF]"
  } hover:scale-110 transition-all duration-200`;

  const iconSize = isHorizontal ? 20 : 24;

  return (
    <div
      className={`flex items-center pointer-events-auto ${isHorizontal ? "" : "flex-1 pl-3 pt-3"}`}
    >
      <div className={`flex items-center ${isHorizontal ? "gap-4" : "gap-6 w-full max-w-sm"}`}>
        {LINKS.map(({ href, label, icon: Icon }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={iconClasses}
            aria-label={label}
          >
            <Icon size={iconSize} weight="regular" />
          </a>
        ))}
      </div>
    </div>
  );
}
