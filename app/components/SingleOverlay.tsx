"use client";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  XIcon,
  CaretRightIcon,
  CopyrightIcon,
  ShareFatIcon,
  CircleNotchIcon,
  ClockIcon,
  MicrophoneStageIcon,
} from "@phosphor-icons/react";
import { useAudio } from "app/contexts/AudioContext";
import {
  TRACK_DATA,
  STREAMING_PLATFORM_LABELS,
  type StreamingPlatform,
} from "app/data/tracks";
import { isPatronTrack } from "app/data/patron-config";
import { usePatronStatus } from "app/hooks/usePatronStatus";

const PLATFORM_ICONS: Partial<Record<StreamingPlatform, string>> = {
  spotify: "/icons/streaming/spotify.webp",
  appleMusic: "/icons/streaming/apple-music.webp",
  itunes: "/icons/streaming/itunes.webp",
  deezer: "/icons/streaming/deezer.webp",
  iheartradio: "/icons/streaming/iheartradio.webp",
};

const PlatformTile = ({ platform }: { platform: StreamingPlatform }) => {
  const url = PLATFORM_ICONS[platform];
  if (!url) return <span className="w-12 h-12 bg-neutral-800 shrink-0" />;
  return (
    <span className="relative w-12 h-12 shrink-0 bg-black">
      <Image src={url} alt="" fill sizes="48px" className="object-contain" />
    </span>
  );
};

interface Props {
  trackId: string;
  coverSrc: string;
  href?: string;
  onClose: () => void;
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export default function SingleOverlay({ trackId, coverSrc, href, onClose }: Props) {
  const { loadTrack, currentTrack, isPlaying, isLoading, buffered, currentTime, duration, toggle } =
    useAudio();
  const isPatron = usePatronStatus();

  const trackData = TRACK_DATA.find((t) => t.id === trackId);
  const isCurrent = currentTrack?.id === trackId;
  const playing = isCurrent && isPlaying;
  const durationLabel = formatDuration(trackData?.duration);
  const releaseYear = trackData?.releaseDate?.slice(0, 4);

  const isPatronOnly = isPatronTrack(trackId);
  const isHosted = (trackData?.source ?? "hosted") === "hosted";
  const state: "playable" | "patronGated" | "streamOnly" = !isHosted
    ? "streamOnly"
    : isPatronOnly && !isPatron
      ? "patronGated"
      : "playable";

  // Scroll to top on open so cover is fully visible; restore on close.
  useEffect(() => {
    const scrollY = window.scrollY;
    if (scrollY > 0) {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
    return () => {
      if (scrollY > 0) {
        window.scrollTo({ top: scrollY, behavior: "instant" as ScrollBehavior });
      }
    };
  }, []);

  const handleShare = async () => {
    if (!trackData) return;
    const shareData = {
      title: `Peyt Spencer - ${trackData.title}`,
      text: `Listen to ${trackData.title} by Peyt Spencer`,
      url: `https://peytspencer.com/${trackId}`,
    };
    if (typeof navigator === "undefined") return;
    try {
      if (typeof navigator.share === "function") {
        await navigator.share(shareData);
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareData.url);
      }
    } catch {
      // User cancelled or share failed - ignore
    }
  };

  const handlePlayToggle = () => {
    if (isCurrent) {
      toggle();
      return;
    }
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
      true,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start bg-black/80 backdrop-blur-md animate-fade-in md:items-center md:justify-center md:p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-h-screen overflow-y-auto bg-neutral-950 md:max-h-[calc(100vh-2rem)] md:max-w-md md:rounded-2xl md:ring-1 md:ring-white/10 md:shadow-[0_20px_80px_-20px_rgba(249,115,22,0.3)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="fixed md:absolute right-4 z-30 flex flex-col items-center gap-2"
          style={{ top: "max(1rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))" }}
        >
          <button
            aria-label="Close"
            onClick={onClose}
            className="w-12 h-12 md:w-11 md:h-11 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white/90 hover:text-orange-500 hover:bg-black/80 active:bg-black transition-colors"
          >
            <XIcon className="w-5 h-5" weight="bold" />
          </button>
          <button
            aria-label="Share"
            onClick={handleShare}
            className="w-12 h-12 md:w-11 md:h-11 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white/90 hover:text-orange-500 hover:bg-black/80 active:bg-black transition-colors"
          >
            <ShareFatIcon className="w-5 h-5" weight="bold" />
          </button>
        </div>

        <div className="relative aspect-square w-full">
          <Image
            src={coverSrc}
            alt={trackData ? `${trackData.artist} - ${trackData.title}` : ""}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />

          {state === "playable" && (
            <button
              onClick={handlePlayToggle}
              aria-label={playing ? "Pause" : isLoading && isCurrent ? "Loading" : "Play"}
              className="absolute inset-0 flex items-center justify-center group/play"
            >
              <span className="relative w-20 h-20 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center text-white transition-all duration-200 group-hover/play:scale-105 group-hover/play:bg-black/75">
                {isCurrent && (buffered > 0 || currentTime > 0) && (
                  <svg
                    className="absolute inset-0 -rotate-90 pointer-events-none overflow-visible"
                    viewBox="0 0 100 100"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="overlay-playback" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#f97316" />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="50"
                      cy="50"
                      r="50"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="3"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="50"
                      fill="none"
                      stroke="rgba(255,255,255,0.45)"
                      strokeWidth="3"
                      pathLength={100}
                      strokeDasharray="100"
                      strokeDashoffset={100 - buffered * 100}
                      style={{ transition: "stroke-dashoffset 250ms linear" }}
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="50"
                      fill="none"
                      stroke="url(#overlay-playback)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray="100"
                      strokeDashoffset={duration > 0 ? 100 - (currentTime / duration) * 100 : 100}
                    />
                  </svg>
                )}
                {isLoading && isCurrent ? (
                  <CircleNotchIcon className="w-10 h-10 animate-spin" weight="bold" />
                ) : playing ? (
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
                  </svg>
                ) : (
                  <svg
                    className="w-10 h-10 translate-x-0.5"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </span>
            </button>
          )}

          {state === "patronGated" && (
            <Link
              href="/support#supporter"
              aria-label="Patron unlock"
              className="absolute inset-0 flex items-center justify-center group/play"
            >
              <span className="relative w-20 h-20 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center text-white transition-all duration-200 group-hover/play:scale-105 group-hover/play:bg-black/75">
                <svg
                  className="w-9 h-9 translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 ring-2 ring-neutral-950 flex items-center justify-center">
                  <MicrophoneStageIcon className="w-3.5 h-3.5 text-white" weight="bold" />
                </span>
              </span>
            </Link>
          )}

          {/* state === "streamOnly": no center button — streaming list below is the action */}
        </div>

        {trackData?.label && (
          <div className="px-5 h-12 flex items-center justify-between gap-3 text-[15px] font-medium tracking-wide text-white bg-neutral-900 border-b border-neutral-800">
            <span className="inline-flex items-center gap-1.5 leading-none">
              <CopyrightIcon className="w-4 h-4 shrink-0" weight="regular" />
              <span>
                {releaseYear} {trackData.label}
              </span>
            </span>
            {durationLabel && (
              <span className="inline-flex items-center gap-1.5 leading-none tabular-nums">
                <ClockIcon className="w-4 h-4 shrink-0" weight="regular" />
                <span>{durationLabel}</span>
              </span>
            )}
          </div>
        )}

        {trackData?.streamingLinks?.length ? (
          <div className="flex flex-col">
            {trackData.streamingLinks.map((link) => (
              <Link
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group/link flex items-stretch"
              >
                <PlatformTile platform={link.platform} />
                <span className="flex-1 flex items-center justify-between gap-2 px-5 bg-neutral-900 group-hover/link:bg-neutral-800 transition-colors">
                  <span className="text-white text-[15px] font-medium tracking-wide">
                    {STREAMING_PLATFORM_LABELS[link.platform]}
                  </span>
                  <CaretRightIcon
                    className="w-4 h-4 text-neutral-500 group-hover/link:text-orange-500 group-hover/link:translate-x-0.5 transition-all"
                    weight="bold"
                  />
                </span>
              </Link>
            ))}
          </div>
        ) : href ? (
          <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bebas text-2xl tracking-wider transition-colors"
          >
            STREAM
            <CaretRightIcon className="w-5 h-5" weight="bold" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
