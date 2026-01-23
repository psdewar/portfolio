import {
  InstagramLogoIcon,
  TiktokLogoIcon,
  YoutubeLogoIcon,
  TwitterLogoIcon,
  FacebookLogoIcon,
  SpotifyLogoIcon,
} from "@phosphor-icons/react";

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
        <a
          href="https://open.spotify.com/artist/2i77XjQtnVre1eS46M2ZlN"
          target="_blank"
          rel="noopener noreferrer"
          className={iconClasses}
          aria-label="Spotify"
        >
          <SpotifyLogoIcon size={iconSize} weight="regular" />
        </a>

        <a
          href="https://instagram.com/peytspencer"
          target="_blank"
          rel="noopener noreferrer"
          className={iconClasses}
          aria-label="Instagram"
        >
          <InstagramLogoIcon size={iconSize} weight="regular" />
        </a>

        <a
          href="https://tiktok.com/@peytspencer"
          target="_blank"
          rel="noopener noreferrer"
          className={iconClasses}
          aria-label="TikTok"
        >
          <TiktokLogoIcon size={iconSize} weight="regular" />
        </a>

        <a
          href="https://youtube.com/@peytspencer"
          target="_blank"
          rel="noopener noreferrer"
          className={iconClasses}
          aria-label="YouTube"
        >
          <YoutubeLogoIcon size={iconSize} weight="regular" />
        </a>

        <a
          href="https://twitter.com/peytspencer"
          target="_blank"
          rel="noopener noreferrer"
          className={iconClasses}
          aria-label="Twitter"
        >
          <TwitterLogoIcon size={iconSize} weight="regular" />
        </a>

        <a
          href="https://facebook.com/9psd2"
          target="_blank"
          rel="noopener noreferrer"
          className={iconClasses}
          aria-label="Facebook"
        >
          <FacebookLogoIcon size={iconSize} weight="regular" />
        </a>
      </div>
    </div>
  );
}
