"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useAudio } from "./contexts/AudioContext";
import { TRACK_DATA } from "./data/tracks";

// Latest single - change this when you release new music
const LATEST_SINGLE_ID = "patience";

export default function Page() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [shouldAnimate, setShouldAnimate] = useState<boolean | null>(null); // null = not yet determined
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasAnimatedRef = useRef(false); // Tracks if animation already played this mount
  const { currentTrack, isPlaying, isLoading, loadTrack, toggle } = useAudio();

  useEffect(() => {
    // Small delay to ensure the initial hidden state renders before animation triggers
    const timer = setTimeout(() => {
      if (hasAnimatedRef.current) {
        setShouldAnimate(false); // Already animated this session
      } else {
        setShouldAnimate(true); // First mount, animate
        hasAnimatedRef.current = true;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  const imgClass = (i: number, alwaysColor = false) => {
    const base = "object-cover transform transition duration-300 ease-out";
    if (alwaysColor) {
      // happy: colored when nothing else is highlighted or when itself is highlighted;
      // become gray when some other photo is highlighted
      const isColored = hovered === null || hovered === i;
      const colorClass = isColored ? "grayscale-0" : "grayscale";
      const scaleClass = hovered === i ? "scale-105" : "";
      return `${base} ${colorClass} ${scaleClass}`.trim();
    }
    if (hovered === null) return `${base} grayscale`;
    return hovered === i ? `${base} grayscale-0 scale-105` : `${base} grayscale`;
  };

  const imgHandlers = (i: number) => ({
    onMouseEnter: () => {
      setHovered(i);
      // Mute video when hovering other images
      if (i !== 3 && videoRef.current && !isMuted) {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    },
    onMouseLeave: () => setHovered(null),
    onTouchStart: () => {
      setHovered(i);
      // Mute video when tapping other images
      if (i !== 3 && videoRef.current && !isMuted) {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    },
    onTouchEnd: () => setHovered(null),
  });

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  return (
    <div
      className={`fixed inset-0 m-0 bg-neutral-50 dark:bg-neutral-900 overflow-hidden ${
        currentTrack ? "pb-16 sm:pb-20" : ""
      }`}
    >
      {/* Layer 1: images (z-0) - grayscale by default, color + slight scale on hover/tap */}
      <div className="absolute inset-0 z-0">
        <div
          className={`h-full grid grid-cols-2 grid-rows-4 sm:grid-rows-6 sm:grid-cols-3 gap-0 ${
            currentTrack ? "pb-16 sm:pb-20" : ""
          }`}
        >
          <div className="relative row-span-3 sm:row-span-6 overflow-hidden" {...imgHandlers(1)}>
            <Image
              alt="newera"
              src={"/images/home/new-era-1.jpg"}
              fill
              className={imgClass(1)}
              priority
            />
            <div
              className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
                hovered === 1 ? "opacity-0" : "opacity-100 bg-black/50"
              }`}
            />
          </div>
          <div className="relative row-span-1 sm:row-span-3 overflow-hidden" {...imgHandlers(2)}>
            <Image
              alt="bio"
              src={"/images/home/bio.jpeg"}
              fill
              className={imgClass(2, true)}
              loading="lazy"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
            {/* happy image: becomes grayed when another photo is highlighted */}
            <div
              className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
                hovered === null || hovered === 2 ? "opacity-0" : "opacity-100 bg-black/50"
              }`}
            />
          </div>
          <div
            className="relative row-span-3 sm:row-span-6 overflow-hidden"
            {...imgHandlers(3)}
            onClick={toggleMute}
          >
            <video
              ref={videoRef}
              className={`${imgClass(3)} absolute inset-0 w-full h-full object-cover`}
              loop
              muted
              autoPlay
            >
              <source src="/videos/windstock.mp4" type="video/mp4" />
            </video>
            <div
              className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
                hovered === 3 ? "opacity-0" : "opacity-100 bg-black/50"
              }`}
            />
            {/* Volume control icon */}
            <button
              className="absolute top-4 right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors duration-200 text-white pointer-events-auto"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                  />
                </svg>
              )}
            </button>
          </div>
          <div className="relative row-span-3 sm:row-span-6 overflow-hidden" {...imgHandlers(4)}>
            <Image
              alt="openmic"
              src={"/images/home/openmic.jpg"}
              fill
              className={imgClass(4)}
              priority
            />
            <div
              className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
                hovered === 4 ? "opacity-0" : "opacity-100 bg-black/50"
              }`}
            />
          </div>
        </div>
      </div>

      {/* Full-screen hero overlay */}
      <div
        className={`absolute inset-0 z-20 pointer-events-none ${
          currentTrack ? "mb-16 sm:mb-20" : ""
        }`}
      >
        {/* Vignette overlay for text separation */}
        <div className="absolute inset-0">
          {/* Radial dark gradient centered where text is */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(0,0,0,0.5)_0%,transparent_70%)]" />
        </div>

        {/* Name across the screen */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-4 gap-0">
          {/* Soft glow/shadow behind text for better readability */}
          <div className="relative">
            {/* Shadow layer - slightly offset duplicate for depth */}
            <h1
              className={`font-bebas text-[12vw] sm:text-[9vw] lg:text-[7vw] leading-[0.85] tracking-tight text-center select-none absolute inset-0 text-black/30 blur-xl scale-110 transition-opacity duration-0 ${
                shouldAnimate === null ? "opacity-0" : "opacity-100"
              }`}
              aria-hidden="true"
            >
              PEYT SPENCER
            </h1>
            <h1
              className={`font-bebas text-[12vw] sm:text-[9vw] lg:text-[7vw] leading-[0.85] tracking-tight text-center select-none relative drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] ${
                shouldAnimate === null
                  ? "opacity-0"
                  : shouldAnimate
                  ? "animate-hero-slide-up"
                  : "opacity-100"
              }`}
              title="Peyt rhymes with heat"
              aria-label="Peyt rhymes with heat"
            >
              <span className="text-white">PEYT </span>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-red-500 to-pink-500">
                SPENCER
              </span>
            </h1>
          </div>

          {/* Play button below - auto width, animated reveal */}
          <button
            onClick={() => {
              const latestTrackData = TRACK_DATA.find((t) => t.id === LATEST_SINGLE_ID);
              if (latestTrackData) {
                if (currentTrack?.id === LATEST_SINGLE_ID) {
                  toggle();
                } else {
                  loadTrack(
                    {
                      id: latestTrackData.id,
                      title: latestTrackData.title,
                      artist: latestTrackData.artist,
                      src: latestTrackData.audioUrl,
                      thumbnail: latestTrackData.thumbnail,
                      duration: latestTrackData.duration,
                    },
                    true
                  );
                }
              }
            }}
            className={`pointer-events-auto mt-2 px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 disabled:bg-white/5 text-white text-lg md:text-xl lg:text-2xl font-medium transition-colors duration-200 backdrop-blur-sm relative overflow-hidden ${
              currentTrack ? "" : "animate-button-reveal"
            }`}
            disabled={isLoading}
          >
            <span className="flex items-center justify-center gap-2">
              {isLoading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Queueing up the track...
                </>
              ) : currentTrack?.id === LATEST_SINGLE_ID && isPlaying ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Play my latest single
                </>
              )}
            </span>
            {/* Invisible spacer to maintain button width */}
            <span
              className="flex items-center gap-2 h-0 overflow-hidden pointer-events-none"
              aria-hidden="true"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Play my latest single
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
