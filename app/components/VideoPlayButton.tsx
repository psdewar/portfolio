"use client";

import { useCallback, useState, useEffect, useRef, ReactNode } from "react";
import Image from "next/image";

interface VideoPlayButtonProps {
  thumbnailSrc?: string;
  videoSrc: string;
  alt?: string;
  className?: string;
  instagramUrl?: string;
  children?: ReactNode;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  startTime?: number;
}

export function VideoPlayButton({
  thumbnailSrc,
  videoSrc,
  alt = "",
  className = "",
  instagramUrl,
  children,
  isOpen = false,
  onOpen,
  onClose,
  startTime = 0,
}: VideoPlayButtonProps) {
  const [isPlaying, setIsPlaying] = useState(isOpen);
  const videoRef = useRef<HTMLVideoElement>(null);
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    setIsPlaying(isOpen);
  }, [isOpen]);

  useEffect(() => {
    if (isPlaying && videoRef.current) {
      videoRef.current.currentTime = startTime;
    }
  }, [isPlaying, startTime]);

  const handleClick = () => {
    setIsPlaying(true);
    onOpen?.();
  };

  const handleClose = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    onClose?.();
  };

  if (isPlaying) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-8">
        <div className="absolute inset-0" onClick={handleClose} />
        <video
          ref={videoRef}
          src={videoSrc}
          controls
          autoPlay
          className="relative h-full max-h-screen w-auto max-w-full object-contain rounded"
          onEnded={handleEnded}
          playsInline
          preload="none"
        />
        <div>
          <button
            aria-label="Close video"
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl font-bold"
          >
            ✕
          </button>
          {instagramUrl && (
            <a
              aria-label="Open IG reel"
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute top-16 right-4 text-white/80 hover:text-white text-2xl font-bold flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative group cursor-pointer rounded-lg overflow-hidden ${className}`}
      onClick={handleClick}
    >
      {children
        ? children
        : thumbnailSrc && (
            <Image src={thumbnailSrc} alt={alt} fill className="object-cover rounded-lg" />
          )}
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all">
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-green-600 bg-opacity-90 flex items-center justify-center group-hover:scale-110 transition-transform">
          <svg
            className="w-8 h-8 lg:w-10 lg:h-10 text-white ml-1"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
