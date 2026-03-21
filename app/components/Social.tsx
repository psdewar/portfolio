import {
  InstagramLogoIcon,
  TiktokLogoIcon,
  YoutubeLogoIcon,
  TwitterLogoIcon,
  FacebookLogoIcon,
  SpotifyLogoIcon,
  type Icon,
} from "@phosphor-icons/react";

export const SOCIAL_LINKS: { href: string; label: string; username: string; icon: Icon; color: string }[] = [
  {
    href: "https://open.spotify.com/artist/2i77XjQtnVre1eS46M2ZlN",
    label: "Spotify",
    username: "Peyt Spencer",
    icon: SpotifyLogoIcon,
    color: "#1DB954",
  },
  {
    href: "https://instagram.com/peytspencer",
    label: "Instagram",
    username: "@peytspencer",
    icon: InstagramLogoIcon,
    color: "#E4405F",
  },
  {
    href: "https://youtube.com/@peytspencer",
    label: "YouTube",
    username: "@peytspencer",
    icon: YoutubeLogoIcon,
    color: "#FF0000",
  },
  {
    href: "https://tiktok.com/@peytspencer",
    label: "TikTok",
    username: "@peytspencer",
    icon: TiktokLogoIcon,
    color: "#69C9D0",
  },
  {
    href: "https://twitter.com/peytspencer",
    label: "X (Twitter)",
    username: "@peytspencer",
    icon: TwitterLogoIcon,
    color: "#1DA1F2",
  },
  {
    href: "https://facebook.com/9psd2",
    label: "Facebook",
    username: "9psd2",
    icon: FacebookLogoIcon,
    color: "#1877F2",
  },
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
        {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
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
