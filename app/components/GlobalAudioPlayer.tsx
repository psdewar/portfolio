"use client";
import React, { MouseEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAudio } from "../contexts/AudioContext";
import { usePathname } from "next/navigation";

// Parsed lyrics data - imported at build time from SRT files
// Format: { start: seconds, end: seconds, text: string, isCTA?: boolean }
import patienceLyrics from "../../data/lyrics/patience.json";

type LyricLine = { start: number; end: number; text: string; isCTA?: boolean };
const LYRICS_DATA: Record<string, LyricLine[]> = {
  patience: patienceLyrics as LyricLine[],
};

// CTA marker - when lyrics contain this, show the buy link instead
const CTA_MARKER = "[GET FULL LYRICS]";

const PlayIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
  </svg>
);

const LyricsIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
    />
  </svg>
);

export const GlobalAudioPlayer: React.FC = () => {
  const pathname = usePathname() ?? "/";
  const isHirePage = pathname === "/hire";
  const isFundPage = pathname.startsWith("/fund");
  const isQuickShop = pathname === "/shop/quick";
  const [showLyrics, setShowLyrics] = useState(true);

  const { currentTrack, isPlaying, currentTime, duration, isLoading, toggle, seekTo, formatTime } =
    useAudio();

  // Don't render if no track is loaded or if on hire/fund/quick-shop pages
  if (!currentTrack || isHirePage || isFundPage || isQuickShop) return null;

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const lyrics = LYRICS_DATA[currentTrack.id] || [];
  // Offset to make lyrics appear earlier (compensate for reaction time when syncing)
  const LYRICS_OFFSET = 0.3;
  const adjustedTime = currentTime + LYRICS_OFFSET;
  const currentLyric = lyrics.find((l) => adjustedTime >= l.start && adjustedTime < l.end);
  const hasLyrics = lyrics.length > 0;
  const isCtaLyric = currentLyric?.text.includes(CTA_MARKER) || currentLyric?.text === "...";

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    seekTo(newTime);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-area-inset-bottom">
      {/* Main player */}
      <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800">
        {/* Progress bar - clickable full width at top */}
        <div
          className="h-1.5 bg-neutral-200 dark:bg-neutral-700 cursor-pointer relative group"
          onClick={handleProgressClick}
        >
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-pink-500"
            style={{ width: `${progressPercentage}%` }}
          />
          {/* Hover indicator */}
          <div className="absolute inset-0 bg-black/10 dark:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div
          className="px-3 sm:px-4 cursor-pointer"
          onClick={(e) => {
            // Don't toggle if clicking on lyrics toggle button or progress bar
            const target = e.target as HTMLElement;
            if (target.closest("[data-no-toggle]")) return;
            toggle();
          }}
        >
          <div className="flex items-center gap-3">
            {/* Left: Album art + title + time */}
            <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
              {currentTrack.thumbnail && (
                <div className="w-12 h-12 sm:w-14 sm:h-14 overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex-shrink-0 -ml-3 sm:-ml-4">
                  <Image
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    width={56}
                    height={56}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {currentTrack.title}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
            </div>

            {/* Center: Lyrics (desktop and mobile, inline) */}
            {hasLyrics && showLyrics && (
              <div className="flex-1 flex items-center justify-center min-w-0 px-2 sm:px-4">
                {isCtaLyric ? (
                  <Link
                    href="/shop"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white text-xs sm:text-sm font-medium rounded-full transition-all hover:scale-105 flex-shrink-0"
                  >
                    Get full lyrics
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13 7l5 5m0 0l-5 5m5-5H6"
                      />
                    </svg>
                  </Link>
                ) : (
                  <p
                    className={`text-neutral-700 dark:text-neutral-200 font-medium text-center leading-tight ${
                      (currentLyric?.text?.length || 0) > 80
                        ? "text-[10px] sm:text-xs"
                        : (currentLyric?.text?.length || 0) > 60
                        ? "text-[11px] sm:text-sm"
                        : (currentLyric?.text?.length || 0) > 40
                        ? "text-xs sm:text-base"
                        : "text-sm sm:text-base md:text-lg"
                    }`}
                  >
                    {currentLyric?.text || "♪"}
                  </p>
                )}
              </div>
            )}

            {/* Spacer when lyrics hidden */}
            {(!hasLyrics || !showLyrics) && <div className="flex-1" />}

            {/* Right: Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {/* Lyrics toggle */}
              {hasLyrics && (
                <button
                  data-no-toggle
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowLyrics(!showLyrics);
                  }}
                  className={`w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full transition-colors ${
                    showLyrics
                      ? "bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white"
                      : "hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 dark:text-neutral-500"
                  }`}
                  aria-label={showLyrics ? "Hide lyrics" : "Show lyrics"}
                >
                  <LyricsIcon className="w-5 h-5" />
                </button>
              )}

              {/* Play/pause button - square, flush to corner */}
              <button
                data-no-toggle
                onClick={(e) => {
                  e.stopPropagation();
                  toggle();
                }}
                disabled={isLoading}
                className="w-12 h-12 sm:w-14 sm:h-14 -mr-3 sm:-mr-4 flex items-center justify-center bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 transition-all duration-200 active:scale-95 disabled:opacity-50"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                ) : isPlaying ? (
                  <PauseIcon className="w-5 h-5" />
                ) : (
                  <PlayIcon className="w-5 h-5 ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
