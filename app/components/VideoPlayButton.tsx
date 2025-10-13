"use client";

import { ReactNode } from "react";
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
  const handleToggle = () => {
    if (isOpen) {
      onClose?.();
    } else {
      onOpen?.();
    }
  };

  return (
    <div
      className={`relative group cursor-pointer rounded-lg overflow-hidden ${className}`}
      onClick={handleToggle}
    >
      {children
        ? children
        : thumbnailSrc && (
            <Image src={thumbnailSrc} alt={alt} fill className="object-cover rounded-lg" />
          )}
      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all">
        <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-green-600 bg-opacity-90 flex items-center justify-center group-hover:scale-110 transition-transform">
          {isOpen ? (
            // Pause icon
            <svg
              className="w-8 h-8 lg:w-10 lg:h-10 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            // Play icon
            <svg
              className="w-8 h-8 lg:w-10 lg:h-10 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
