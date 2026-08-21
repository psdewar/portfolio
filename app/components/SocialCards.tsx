"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SOCIAL_LINKS } from "./Social";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
    </svg>
  );
}

const social = (label: string) => SOCIAL_LINKS.find((l) => l.label === label)!;

const CARDS = [
  {
    label: "Spotify",
    href: social("Spotify").href,
    handle: social("Spotify").username,
    logo: "/brand/spotify-full-black.png",
    logoClass: "w-full max-w-[112px] h-auto",
    background: "#1ED760",
    textClass: "text-black/80",
  },
  {
    label: "Apple Music",
    href: "https://music.apple.com/us/artist/peyt-spencer/1361786209",
    handle: "Peyt Spencer",
    logo: "/brand/apple-music-icon.svg",
    logoClass: "w-16 h-16",
    background: "linear-gradient(to top, #FA233B, #FB5C74)",
    textClass: "text-white/90",
  },
  {
    label: "Instagram",
    href: social("Instagram").href,
    handle: social("Instagram").username,
    logo: "/brand/instagram-glyph-white.svg",
    logoClass: "w-14 h-14",
    background:
      "radial-gradient(circle at 0% 110%, #FFD600, #FF7A00 22%, #FF0069 50%, #D300C5 75%, #7638FA 100%)",
    textClass: "text-white/90",
  },
  {
    label: "TikTok",
    href: social("TikTok").href,
    handle: social("TikTok").username,
    logo: "/brand/tiktok-logo-white.png",
    logoClass: "w-full max-w-[104px] h-auto",
    background:
      "radial-gradient(circle at 18% 12%, rgba(37, 244, 238, 0.16), transparent 48%), radial-gradient(circle at 85% 88%, rgba(254, 44, 85, 0.16), transparent 48%), #000000",
    textClass: "text-white/70",
  },
  {
    label: "YouTube",
    href: social("YouTube").href,
    handle: social("YouTube").username,
    logo: "/brand/youtube-white.svg",
    logoClass: "w-full max-w-[116px] h-auto",
    background: "#FF0033",
    textClass: "text-white/90",
  },
  {
    label: "X",
    href: social("X (Twitter)").href,
    handle: social("X (Twitter)").username,
    logo: "/brand/x-logo-white.png",
    logoClass: "w-11 h-auto",
    background: "linear-gradient(160deg, #2e2e2e, #000000 60%)",
    textClass: "text-white/70",
  },
  {
    label: "Facebook",
    href: social("Facebook").href,
    handle: social("Facebook").username,
    logo: "/brand/facebook-f.svg",
    logoClass: "w-14 h-14",
    background: "linear-gradient(to top, #0062E0, #19AFFF)",
    textClass: "text-white/90",
  },
];

export default function SocialCards() {
  const ref = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(true);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.clientWidth + 12 : el.clientWidth;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  const glass =
    "absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full " +
    "bg-white/45 dark:bg-neutral-900/40 backdrop-blur-xl ring-1 ring-black/[0.06] dark:ring-white/15 " +
    "shadow-lg shadow-black/10 text-neutral-900 dark:text-white transition duration-200 " +
    "hover:bg-white/65 dark:hover:bg-neutral-900/60 active:scale-90";

  return (
    <div className="relative">
      <div
        ref={ref}
        onScroll={sync}
        className="-mx-4 px-4 scroll-px-4 sm:mx-0 sm:px-0 sm:scroll-px-0 flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {CARDS.map((card) => (
          <a
            key={card.label}
            href={card.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${card.label}: ${card.handle}`}
            className="snap-start shrink-0 w-[150px] aspect-[4/5] rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:scale-[1.02]"
            style={{ background: card.background }}
          >
            <div className="flex-1 min-h-0 flex items-center justify-center px-5">
              <img src={card.logo} alt="" className={card.logoClass} loading="lazy" />
            </div>
            <div className="px-3 pb-3 min-w-0 text-center">
              <span className={`block text-sm font-medium truncate ${card.textClass}`}>
                {card.handle}
              </span>
            </div>
          </a>
        ))}
      </div>

      {canLeft && (
        <button type="button" onClick={() => nudge(-1)} aria-label="Previous platforms" className={`${glass} left-2`}>
          <Chevron dir="left" />
        </button>
      )}
      {canRight && (
        <button type="button" onClick={() => nudge(1)} aria-label="More platforms" className={`${glass} right-2`}>
          <Chevron dir="right" />
        </button>
      )}
    </div>
  );
}
