"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "app/ArrowIcon";
import { useAudio } from "app/contexts/AudioContext";
import { TRACK_DATA } from "app/data/tracks";

interface Props {
  trackId: string;
  coverSrc: string;
  href?: string;
  onClose: () => void;
}

export default function FreestyleOverlay({
  trackId,
  coverSrc,
  href,
  onClose,
}: Props) {
  const { loadTrack, currentTrack, isPlaying, toggle } = useAudio();

  const isCurrent = currentTrack?.id === trackId;
  const playing = isCurrent && isPlaying;

  const handlePlayToggle = () => {
    if (isCurrent) {
      toggle();
      return;
    }

    const trackData = TRACK_DATA.find((t) => t.id === trackId);
    if (!trackData) return;

    loadTrack(
      {
        id: trackData.id,
        title: trackData.title,
        artist: trackData.artist,
        src: trackData.audioUrl,
        thumbnail: trackData.thumbnail,
        duration: trackData.duration,
      },
      true
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60">
      <div className="relative max-w-md w-full flex flex-col overflow-hidden">
        {/* Close button */}
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-3 right-3 z-20 text-white hover:text-gray-300"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Square image with play button */}
        <div className="relative aspect-square w-full">
          <Image src={coverSrc} alt="Freestyle cover" fill className="object-cover" />

          {/* Gradient overlay for title */}
          <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

          {/* Title overlay */}
          <h3 className="absolute bottom-4 left-0 right-0 font-bebas text-2xl text-white tracking-tight text-center px-4 z-10 leading-none">
            Peyt Spencer - Mula Freestyle
          </h3>

          <button
            onClick={handlePlayToggle}
            aria-label={playing ? "Pause" : "Play"}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <div className="relative w-16 h-16">
              <div
                className={`absolute inset-0 rounded-full bg-black/60 flex items-center justify-center transition-opacity duration-200 ${
                  playing ? "opacity-0" : "opacity-100"
                }`}
              >
                <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
              <div
                className={`absolute inset-0 rounded-full bg-black/60 flex items-center justify-center transition-opacity duration-200 ${
                  playing ? "opacity-100" : "opacity-0"
                }`}
              >
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                </svg>
              </div>
            </div>
          </button>
        </div>

        {/* Stream link */}
        {href && (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-white/90 hover:bg-white text-black rounded-b-xl font-medium text-lg shadow-lg"
          >
            STREAM <ArrowIcon />
          </Link>
        )}
      </div>
    </div>
  );
}
