"use client";
import React, { MouseEvent, TouchEvent, useState, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAudio } from "../contexts/AudioContext";
import { usePathname } from "next/navigation";
import {
  PlayIcon,
  PauseIcon,
  ChatTextIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";

// Parsed lyrics data - imported at build time from SRT files
// Format: { start: seconds, end: seconds, text: string, isCTA?: boolean }
import patienceLyrics from "../../data/lyrics/patience.json";

type LyricLine = { start: number; end: number; text: string; isCTA?: boolean };
const LYRICS_DATA: Record<string, LyricLine[]> = {
  patience: patienceLyrics as LyricLine[],
};

const CTA_MARKER = "[GET FULL LYRICS]";

export const GlobalAudioPlayer: React.FC = () => {
  const pathname = usePathname() ?? "/";
  const [showLyrics, setShowLyrics] = useState(true);
  const { currentTrack, isPlaying, currentTime, duration, isLoading, toggle, seekTo, formatTime } =
    useAudio();
  const progressRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubX, setScrubX] = useState<number | null>(null);

  const getPercentFromX = useCallback((clientX: number) => {
    const rect = progressRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }, []);

  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    const pct = getPercentFromX(e.clientX);
    if (pct !== null) {
      setScrubX(pct);
      seekTo(pct * duration);
    }
  }, [getPercentFromX, seekTo, duration]);

  const handleMouseUp = useCallback(() => {
    setIsScrubbing(false);
    setScrubX(null);
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseMove]);

  const isHirePage = pathname === "/hire";
  const isFundPage = pathname.startsWith("/fund");
  const isQuickShop = pathname === "/shop/quick";
  if (!currentTrack || isHirePage || isFundPage || isQuickShop) return null;

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const lyrics = LYRICS_DATA[currentTrack.id] || [];
  const LYRICS_OFFSET = 0.3;
  const adjustedTime = currentTime + LYRICS_OFFSET;
  const currentLyric = lyrics.find((l) => adjustedTime >= l.start && adjustedTime < l.end);
  const hasLyrics = lyrics.length > 0;
  const isCtaLyric = currentLyric?.text.includes(CTA_MARKER) || currentLyric?.text === "...";

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    const pct = getPercentFromX(e.clientX);
    if (pct !== null) seekTo(pct * duration);
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    const pct = getPercentFromX(e.clientX);
    if (pct !== null) {
      setScrubX(pct);
      seekTo(pct * duration);
    }
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    setIsScrubbing(true);
    const touch = e.touches[0];
    const pct = getPercentFromX(touch.clientX);
    if (pct !== null) {
      setScrubX(pct);
      seekTo(pct * duration);
    }
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    const pct = getPercentFromX(touch.clientX);
    if (pct !== null) {
      setScrubX(pct);
      seekTo(pct * duration);
    }
  };

  const handleTouchEnd = () => {
    setIsScrubbing(false);
    setScrubX(null);
  };

  const thumbPosition = scrubX !== null ? scrubX * 100 : progressPercentage;
  // Interpolate gradient color: orange-500 (#f97316) -> pink-500 (#ec4899)
  const t = thumbPosition / 100;
  const thumbColor = `rgb(${Math.round(249 + (236 - 249) * t)}, ${Math.round(115 + (72 - 115) * t)}, ${Math.round(22 + (153 - 22) * t)})`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 safe-area-inset-bottom">
      {/* Main player */}
      <div className="bg-white/95 dark:bg-black/95 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800">
        {/* Progress bar with expanded hit area extending upward */}
        <div
          ref={progressRef}
          className="relative h-1.5 cursor-pointer group"
          onClick={handleProgressClick}
          onMouseDown={handleMouseDown}
          onMouseEnter={() => setScrubX(progressPercentage / 100)}
          onMouseLeave={() => { if (!isScrubbing) setScrubX(null); }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Invisible expanded touch target */}
          <div className="absolute -top-3 left-0 right-0 bottom-0" />
          {/* Visible bar */}
          <div className="absolute inset-0 bg-neutral-200 dark:bg-neutral-700">
            <div
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-500 to-pink-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {/* Circular thumb - vertically centered on the bar */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full shadow-md shadow-black/20 pointer-events-none transition-opacity duration-150 ${
              scrubX !== null ? "opacity-100 scale-100" : "opacity-0 scale-75"
            }`}
            style={{ left: `${thumbPosition}%`, marginLeft: "-8px", backgroundColor: thumbColor }}
          />
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
                    <ArrowRightIcon size={14} weight="bold" />
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
                  <ChatTextIcon size={20} weight="regular" />
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
                  <PauseIcon size={20} weight="fill" />
                ) : (
                  <PlayIcon size={20} weight="fill" className="ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
