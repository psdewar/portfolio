"use client";
import Image from "next/image";
import { VideoPlayButtonWithContext } from "./VideoPlayButtonWithContext";

interface DualVideoImageToggleProps {
  left: { src: string; alt: string };
  right: { src: string; alt: string };
  videoSrc?: string;
  instagramUrl?: string;
  className?: string;
  videoId: string;
}

// Renders two images side-by-side (responsive) with a single centered play overlay spanning both.
// When playing, shows a single video covering the entire composite area. On end, reverts to images.
export function DualVideoImageToggle({
  left,
  right,
  videoSrc = "/videos/boise-fund-60sec.mp4",
  instagramUrl = "https://www.instagram.com/peytspencer/reel/DPg61j5EWb8",
  className = "",
  videoId,
}: DualVideoImageToggleProps) {
  return (
    <VideoPlayButtonWithContext
      videoId={videoId}
      videoSrc={videoSrc}
      instagramUrl={instagramUrl}
      className={className}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex h-full">
        <div className="relative aspect-square lg:flex-1 lg:h-full overflow-hidden rounded-t lg:rounded-l-lg lg:rounded-r-none">
          <Image src={left.src} alt={left.alt} fill priority className="object-cover" />
        </div>
        <div className="relative aspect-square lg:flex-1 lg:h-full overflow-hidden rounded-b-lg lg:rounded-r-lg lg:rounded-l-none">
          <Image src={right.src} alt={right.alt} fill priority className="object-cover" />
        </div>
      </div>
    </VideoPlayButtonWithContext>
  );
}
