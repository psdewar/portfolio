"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "app/ArrowIcon";
import { useAudio } from "app/contexts/AudioContext";
import { TRACK_DATA } from "app/data/tracks";
import React from "react";

interface Props {
  trackId: string;
  coverSrc: string;
  href?: string;
  fixedCheckoutTrack: string | null;
  onClose: () => void;
  handleDownloadClick: (trackId: string) => void;
}

export default function FreestyleOverlay({
  trackId,
  coverSrc,
  href,
  fixedCheckoutTrack,
  onClose,
  handleDownloadClick,
}: Props) {
  const { loadTrack, currentTrack, isPlaying, toggle, play } = useAudio();

  const isCurrent = currentTrack?.id === trackId;
  const playing = isCurrent && isPlaying;

  const handlePlayToggle = async () => {
    // If it's the current track, toggle play/pause
    if (isCurrent) {
      toggle();
      return;
    }

    const trackData = TRACK_DATA.find((t) => t.id === trackId);
    if (!trackData) return;

    const audioTrack = {
      id: trackData.id,
      title: trackData.title,
      artist: trackData.artist,
      src: trackData.audioUrl,
      thumbnail: trackData.thumbnail,
      duration: trackData.duration,
    };

    await loadTrack(audioTrack);
    // Because this is triggered by a user gesture, calling play() should be permitted
    try {
      play();
    } catch (err) {
      // ignore - playback may still be blocked
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60">
      <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 max-w-md w-full text-center relative">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <div className="mx-auto w-56 h-56 relative">
          <Image src={coverSrc} alt="Freestyle cover" fill className="object-cover rounded-lg" />

          {/* Clickable play/pause icon centered over cover (crossfade between icons) */}
          <button
            onClick={async (e) => {
              e.stopPropagation();
              await handlePlayToggle();
            }}
            aria-label={playing ? "Pause" : "Play"}
            className="absolute inset-0 flex items-center justify-center"
          >
            <div className="relative w-24 h-24">
              <div
                className={`absolute inset-0 rounded-full bg-black/60 flex items-center justify-center transition-opacity duration-200 ${
                  playing ? "opacity-0" : "opacity-100"
                }`}
              >
                <svg
                  className="w-10 h-10 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>

              <div
                className={`absolute inset-0 rounded-full bg-black/60 flex items-center justify-center transition-opacity duration-200 ${
                  playing ? "opacity-100" : "opacity-0"
                }`}
              >
                <svg
                  className="w-8 h-8 text-white"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
          Peyt Spencer — Mula Freestyle
        </h3>

        <div className="mt-4 flex flex-col gap-3">
          <button
            onClick={() => handleDownloadClick(trackId)}
            disabled={fixedCheckoutTrack === trackId}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-lg transition-colors shadow-lg disabled:opacity-70 disabled:cursor-wait"
          >
            {fixedCheckoutTrack === trackId ? "Redirecting..." : "$0.99 DOWNLOAD"}
          </button>

          {href && (
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 bg-white/90 hover:bg-white text-black rounded font-medium text-lg shadow-lg"
            >
              STREAM <ArrowIcon />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
