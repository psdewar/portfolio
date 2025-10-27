"use client";
import React, { MouseEvent } from "react";
import Image from "next/image";
import { useAudio } from "../contexts/AudioContext";
import { usePathname } from "next/navigation";

const PlayIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
      clipRule="evenodd"
    />
  </svg>
);

const PauseIcon = () => (
  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
      clipRule="evenodd"
    />
  </svg>
);

const PrevIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z" />
  </svg>
);

const NextIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M4.555 5.168A1 1 0 003 6v8a1 1 0 001.555.832L10 11.202V14a1 1 0 001.555.832l6-4a1 1 0 000-1.664l-6-4A1 1 0 0010 6v2.798L4.555 5.168z" />
  </svg>
);

export const GlobalAudioPlayer: React.FC = () => {
  const pathname = usePathname() ?? "/";
  const isIdeaPage = pathname === "/idea";
  const isIndiePage = pathname.startsWith("/indie");

  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    isLoading,
    play,
    pause,
    toggle,
    seekTo,
    nextTrack,
    previousTrack,
    formatTime,
    playlist,
  } = useAudio();

  // Don't render if no track is loaded or if on idea page
  if (!currentTrack || isIdeaPage || isIndiePage) return null;

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;
    seekTo(newTime);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/60 dark:bg-black/60 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 z-40 px-3 sm:px-4 py-2 sm:py-3 safe-area-inset-bottom">
      <div className="max-w-4xl mx-auto">
        {/* Main player controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Track info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 sm:gap-3">
              {currentTrack.thumbnail && (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex-shrink-0">
                  <Image
                    src={currentTrack.thumbnail}
                    alt={currentTrack.title}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-medium text-neutral-900 dark:text-white truncate">
                  {currentTrack.title}
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                  {currentTrack.artist}
                </div>
              </div>
            </div>
          </div>

          {/* Playback controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* No previous/next buttons since only patience is playable */}

            <button
              onClick={toggle}
              disabled={isLoading}
              className="p-1.5 sm:p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors disabled:opacity-50"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isLoading ? (
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-neutral-300 border-t-neutral-600 rounded-full animate-spin" />
              ) : isPlaying ? (
                <PauseIcon />
              ) : (
                <PlayIcon />
              )}
            </button>

            {/* No next button since only patience is playable */}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-2 sm:mt-3 flex items-center gap-2 sm:gap-3 text-xs text-neutral-600 dark:text-neutral-400">
          <span className="w-8 sm:w-10 text-right text-xs tabular-nums">
            {formatTime(currentTime)}
          </span>

          <div
            className="flex-1 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-full cursor-pointer relative"
            onClick={handleProgressClick}
          >
            <div
              className="absolute top-0 left-0 h-full bg-blue-500 rounded-full transition-all duration-100 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
            {/* Scrubber handle - smaller on mobile */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-blue-500 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200"
              style={{ left: `calc(${progressPercentage}% - 5px)` }}
            />
          </div>

          <span className="w-8 sm:w-10 text-xs tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Custom slider styles */}
      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
};
