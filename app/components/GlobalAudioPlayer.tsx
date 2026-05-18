"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAudio } from "../contexts/AudioContext";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  PlayIcon,
  PauseIcon,
  ArrowRightIcon,
  CaretUpIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CopyrightIcon,
} from "@phosphor-icons/react";
import { TRACK_DATA } from "../data/tracks";
import { getLyrics, getCurrentLyric, isCtaLyric, type LyricLine } from "../lib/lyrics";
import { useLiveStatus } from "../hooks/useLiveStatus";

const ROW_BTN =
  "hover:bg-neutral-300 dark:hover:bg-neutral-700 active:bg-neutral-400 dark:active:bg-neutral-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-inset";

const LyricView: React.FC<{
  lyric?: LyricLine;
  hasLyrics?: boolean;
  trackTitle?: string;
  isLoaded?: boolean;
}> = ({ lyric, hasLyrics, trackTitle, isLoaded }) => {
  if (isCtaLyric(lyric)) {
    return (
      <Link
        href="/shop"
        onClick={(e) => e.stopPropagation()}
        className="pointer-events-auto inline-flex items-center gap-1.5 text-[15px] font-medium text-orange-500 hover:text-pink-500 transition-colors"
      >
        Get full lyrics
        <ArrowRightIcon size={14} weight="bold" />
      </Link>
    );
  }
  if (lyric?.text) {
    return (
      <p className="text-[15px] font-medium text-neutral-800 dark:text-white/85 text-left line-clamp-2 leading-snug w-full">
        {lyric.text}
      </p>
    );
  }
  if (hasLyrics) {
    return (
      <p className={`text-[15px] font-medium text-neutral-600 dark:text-white/55 text-left leading-tight ${isLoaded ? "" : "italic"}`}>
        Read lyrics here...
      </p>
    );
  }
  if (trackTitle) {
    return (
      <p className="text-[15px] font-medium text-neutral-800 dark:text-white/85 w-full text-left truncate">
        {trackTitle}
      </p>
    );
  }
  return null;
};

export const GlobalAudioPlayer: React.FC = () => {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    buffered,
    isLoading,
    toggle,
    seekTo,
    formatTime,
    getLyricTime,
    nextTrack,
    previousTrack,
  } = useAudio();
  const [isScrubbing, setIsScrubbing] = useState(false);

  const isHirePage = pathname === "/hire";
  const isFundPage = pathname.startsWith("/fund");
  const isQuickShop = pathname === "/shop/quick";
  const isLivePage = pathname === "/live";
  const isOverlayOpen = !!searchParams?.get("play");
  const { online: isStreamLive } = useLiveStatus({ enabled: isLivePage });
  const isVisible = !!currentTrack && !isHirePage && !isFundPage && !isQuickShop && !isOverlayOpen && !(isLivePage && isStreamLive);

  useEffect(() => {
    if (isVisible) {
      document.documentElement.style.setProperty(
        "--player-h",
        "calc(96px + env(safe-area-inset-bottom, 0px))",
      );
    } else {
      document.documentElement.style.removeProperty("--player-h");
    }
  }, [isVisible]);

  if (!isVisible) return null;

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  const trackData = TRACK_DATA.find((t) => t.id === currentTrack.id);
  const releaseYear = trackData?.releaseDate?.slice(0, 4);
  const label = trackData?.label;

  const lyricsData = getLyrics(currentTrack.id);
  const currentLyric = getCurrentLyric(currentTrack.id, getLyricTime());

  const handleScrub = (clientX: number, target: HTMLElement) => {
    if (!duration) return;
    const rect = target.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    seekTo(pct * duration);
  };

  const openOverlay = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("play", currentTrack.id);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] sm:px-6 lg:px-8 pointer-events-none">
      <div
        className="md:max-w-md mx-auto pointer-events-auto bg-neutral-200 dark:bg-neutral-800 border-t md:border-x border-neutral-300 dark:border-neutral-700"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
      <button
        type="button"
        aria-label="Seek"
        onPointerDown={(e) => {
          if (!duration) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setIsScrubbing(true);
          handleScrub(e.clientX, e.currentTarget);
        }}
        onPointerMove={(e) => {
          if (!isScrubbing) return;
          handleScrub(e.clientX, e.currentTarget);
        }}
        onPointerUp={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setIsScrubbing(false);
        }}
        onPointerCancel={(e) => {
          e.currentTarget.releasePointerCapture(e.pointerId);
          setIsScrubbing(false);
        }}
        className={`flex flex-col justify-center w-full h-12 px-4 cursor-pointer touch-none group/scrub border-b border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-950 ${isLoading ? "animate-pulse" : ""}`}
      >
        <div
          className={`relative w-full bg-black/10 dark:bg-white/10 overflow-hidden transition-all rounded-full ${
            isScrubbing ? "h-3" : "h-1"
          }`}
        >
          <div
            className="absolute inset-y-0 left-0 bg-black/15 dark:bg-white/25 rounded-full"
            style={{ width: `${buffered * 100}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-3 text-neutral-500 dark:text-white/55 text-[10px] leading-none mt-1.5">
          <span className="tabular-nums shrink-0">{formatTime(currentTime || 0)}</span>
          {label && (
            <span className="inline-flex items-center gap-1 min-w-0">
              <CopyrightIcon className="w-3 h-3 shrink-0" weight="regular" />
              <span className="truncate">
                <span className="tabular-nums">{releaseYear}</span> {label}
              </span>
            </span>
          )}
          <span className="tabular-nums shrink-0">{formatTime(duration || 0)}</span>
        </div>
      </button>

      <div className="relative flex items-stretch border-b border-neutral-300 dark:border-neutral-700">
        <button
          type="button"
          onClick={toggle}
          aria-label={isPlaying || isLoading ? "Pause" : "Play"}
          className="relative shrink-0 w-12 h-12 overflow-hidden hover:bg-neutral-300 dark:hover:bg-neutral-700 active:bg-neutral-400 dark:active:bg-neutral-600 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/60 focus-visible:ring-inset group/play z-10"
        >
          {currentTrack.thumbnail && (
            <img
              src={currentTrack.thumbnail}
              alt={currentTrack.title}
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover/play:bg-black/55 group-active/play:bg-black/65 transition-colors text-white">
            {isPlaying || isLoading ? (
              <PauseIcon size={20} weight="fill" />
            ) : (
              <PlayIcon size={22} weight="fill" className="ml-px" />
            )}
          </span>
        </button>

        <div
          role="button"
          tabIndex={0}
          onClick={openOverlay}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              openOverlay();
            }
          }}
          aria-label="Open track view"
          className={`flex flex-1 items-center min-w-0 px-3 border-x border-neutral-300 dark:border-neutral-700 ${ROW_BTN}`}
        >
          <LyricView lyric={currentLyric} hasLyrics={!!lyricsData} trackTitle={currentTrack.title} isLoaded={!isLoading} />
        </div>

        <div className="flex items-stretch shrink-0">
          <button
            type="button"
            onClick={previousTrack}
            aria-label="Previous track"
            className={`w-12 flex items-center justify-center text-neutral-900 dark:text-white ${ROW_BTN}`}
          >
            <CaretLeftIcon size={20} weight="bold" />
          </button>
          <button
            type="button"
            onClick={nextTrack}
            aria-label="Next track"
            className={`w-12 flex items-center justify-center text-neutral-900 dark:text-white ${ROW_BTN}`}
          >
            <CaretRightIcon size={20} weight="bold" />
          </button>
        </div>

        <button
          type="button"
          onClick={openOverlay}
          aria-label="Open track view"
          className={`w-12 h-12 shrink-0 flex items-center justify-center text-neutral-900 dark:text-white ${ROW_BTN}`}
        >
          <CaretUpIcon size={20} weight="bold" />
        </button>

      </div>
      </div>
    </div>
  );
};
