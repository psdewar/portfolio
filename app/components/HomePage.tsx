"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MicrophoneStageIcon } from "@phosphor-icons/react";

export default function HomePage() {
  const [hovered, setHovered] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [isPatron, setIsPatron] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const patronStatus = localStorage.getItem("patronStatus");
    setIsPatron(patronStatus === "active");
  }, []);

  const imgClass = (i: number, alwaysColor = false) => {
    const base = "object-cover transform transition duration-300 ease-out";
    if (alwaysColor) {
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
      if (i !== 3 && videoRef.current && !isMuted) {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    },
    onMouseLeave: () => setHovered(null),
    onTouchStart: () => {
      setHovered(i);
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
    <div className="h-full">
      <section className="relative h-full">
        <div className="absolute inset-0 z-0">
          <div className="h-full grid grid-cols-2 grid-rows-4 sm:grid-rows-6 sm:grid-cols-3 gap-0">
            <div
              className="relative row-span-3 sm:row-span-6 overflow-hidden order-2 sm:order-none"
              {...imgHandlers(1)}
            >
              <Image
                alt="newera"
                src="/images/home/new-era-1.jpg"
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
            <div
              className="relative row-span-1 sm:row-span-3 overflow-hidden order-1 sm:order-none"
              {...imgHandlers(2)}
            >
              <Image
                alt="bio"
                src="/images/home/bio.jpeg"
                fill
                className={imgClass(2, true)}
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div
                className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
                  hovered === null || hovered === 2 ? "opacity-0" : "opacity-100 bg-black/50"
                }`}
              />
            </div>
            <div
              className="relative row-span-3 sm:row-span-6 overflow-hidden order-3 sm:order-none"
              {...imgHandlers(3)}
              onClick={toggleMute}
            >
              <video
                ref={videoRef}
                className={`${imgClass(3)} absolute inset-0 w-full h-full object-cover`}
                loop
                muted
                autoPlay
                playsInline
              >
                <source src="/videos/windstock.mp4" type="video/mp4" />
              </video>
              <div
                className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
                  hovered === 3 ? "opacity-0" : "opacity-100 bg-black/50"
                }`}
              />
              <button
                className="absolute top-4 right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors text-white pointer-events-auto"
                aria-label={isMuted ? "Unmute video" : "Mute video"}
              >
                {isMuted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            <div
              className="relative row-span-3 sm:row-span-6 overflow-hidden order-4 sm:order-none"
              {...imgHandlers(4)}
            >
              <Image
                alt="openmic"
                src="/images/home/openmic.jpg"
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

        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
          <div className="bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(0,0,0,0.6)_0%,transparent_70%)] absolute inset-0" />
          <div className="relative text-center px-4 pointer-events-auto">
            <h1 className="font-bebas text-6xl md:text-8xl leading-none tracking-tight mb-2">
              <span className="text-white">PEYT</span>{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                SPENCER
              </span>
            </h1>
            <Link
              href={isPatron ? "/listen" : "/patron"}
              className="pointer-events-auto flex items-center justify-center gap-2 py-2.5 px-5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-colors text-white font-medium text-lg mt-1"
            >
              {!isPatron && <MicrophoneStageIcon size={28} weight="regular" />}
              {isPatron ? "Listen now" : "Become my patron"}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
