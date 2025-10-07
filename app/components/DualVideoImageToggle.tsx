"use client";
import { useState, useRef, useCallback } from "react";
import Image from "next/image";
import { track } from "@vercel/analytics/react";

interface DualVideoImageToggleProps {
  left: { src: string; alt: string };
  right: { src: string; alt: string };
  videoSrc?: string; // Placeholder path for combined video
  className?: string;
}

// Renders two images side-by-side (responsive) with a single centered play overlay spanning both.
// When playing, shows a single video covering the entire composite area. On end, reverts to images.
export function DualVideoImageToggle({
  left,
  right,
  videoSrc = "/videos/placeholder.mp4", // TODO: replace with actual video
  className = "",
}: DualVideoImageToggleProps) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handlePlay = useCallback(() => {
    setPlaying(true);
    requestAnimationFrame(() => videoRef.current?.play().catch(() => {}));
    track("play_video", { videoSrc });
  }, [videoSrc]);

  const handleEnded = useCallback(() => setPlaying(false), []);

  return (
    <div className={`relative w-full min-h-[240px] h-full ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-0 lg:flex h-full">
        <div className="relative aspect-square lg:aspect-auto lg:h-full lg:flex-1 overflow-hidden rounded-lg lg:rounded-l-lg lg:rounded-r-none">
          <Image src={left.src} alt={left.alt} fill priority className="object-cover" />
        </div>
        <div className="relative aspect-square lg:aspect-auto lg:h-full lg:flex-1 overflow-hidden rounded-lg lg:rounded-r-lg lg:rounded-l-none">
          <Image src={right.src} alt={right.alt} fill priority className="object-cover" />
        </div>
      </div>
      {!playing && (
        <button
          aria-label="Play video"
          onClick={handlePlay}
          className="group absolute inset-0 flex items-center justify-center hover:bg-black/40 transition rounded-lg"
        >
          <span className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-green-600/90 group-hover:bg-green-600 text-white font-semibold shadow-lg text-sm">
            ▶ Play
          </span>
        </button>
      )}
      {playing && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-8">
          <div className="absolute inset-0" onClick={() => setPlaying(false)} />
          <video
            ref={videoRef}
            src={videoSrc}
            className="relative h-full max-h-screen w-auto max-w-full object-contain"
            onEnded={handleEnded}
            controls
            playsInline
            autoPlay
          />
          <button
            aria-label="Close video"
            onClick={() => setPlaying(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
