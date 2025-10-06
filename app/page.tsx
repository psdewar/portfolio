"use client";
import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAudio } from "./contexts/AudioContext";
import { ArrowIcon } from "./ArrowIcon";

export default function Page() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { currentTrack } = useAudio();

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
    <main
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
              <source src={"./windstock.mp4"} type="video/mp4" />
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

      {/* Centered title with labels underneath */}
      <div
        className={`absolute inset-0 z-20 pointer-events-none ${
          currentTrack ? "mb-16 sm:mb-20" : ""
        }`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative inline-block z-20">
            <div
              className={`absolute inset-0 rounded-lg transition-colors duration-300 pointer-events-none ${
                hovered ? "bg-black/50 backdrop-blur-sm" : "bg-black/20 backdrop-blur-sm"
              }`}
            />
            <div className="relative px-4 py-4 flex flex-col lg:gap-2 justify-between pointer-events-auto">
              <h1
                className="text-white font-semibold text-4xl lg:text-7xl leading-tight"
                title="Peyt rhymes with heat"
                aria-label="Peyt rhymes with heat"
              >
                PEYT SPENCER
              </h1>
              <div className="flex flex-col lg:flex-row items-center w-full">
                <Link
                  title="Listen to my music"
                  aria-label="Listen to my music"
                  className="w-full lg:w-auto text-xl lg:text-2xl font-medium px-2 sm:px-3 py-1 rounded-md transition transform hover:scale-105 hover:bg-white/10 hover:text-white text-white text-center"
                  href="/music"
                >
                  <span>Here, I rap lyrics</span>
                </Link>
                <span className="mx-1 sm:mx-2 lg:mx-4 text-white font-semibold text-lg md:text-xl lg:text-2xl hidden lg:inline">
                  ·
                </span>
                <Link
                  title="Find beats, beat writer's block"
                  aria-label="Find beats, beat writer's block"
                  className="w-full lg:w-auto text-xl lg:text-2xl font-medium px-2 sm:px-3 py-1 rounded-md transition transform hover:scale-105 hover:bg-white/10 hover:text-white text-white text-center"
                  href="https://lyrist.app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="inline-flex items-center gap-2 justify-center">
                    Here&apos;s my app, Lyrist <ArrowIcon />
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
