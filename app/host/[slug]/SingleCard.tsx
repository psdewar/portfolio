"use client";

import { useRef, type RefObject } from "react";
import { TRACK_DATA } from "../../data/tracks";

const SINGLE_IDS = ["best-foot-forward", "patience"];

function SingleItem({
  id,
  audioRef,
  otherRef,
}: {
  id: string;
  audioRef: RefObject<HTMLAudioElement>;
  otherRef: RefObject<HTMLAudioElement>;
}) {
  const track = TRACK_DATA.find((t) => t.id === id);
  if (!track) return null;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  return (
    <div onClick={toggle} className="flex-1 min-w-0 flex flex-col gap-2 cursor-pointer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={track.thumbnail}
        alt={`${track.title} cover`}
        className="w-full aspect-square object-cover"
      />
      <div className="min-w-0">
        <p className="text-sm sm:text-base font-medium leading-tight">{track.title}</p>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 truncate">
          {track.artist}
        </p>
      </div>
      <audio
        ref={audioRef}
        controls
        preload="none"
        src={track.audioUrl}
        onPlay={() => otherRef.current?.pause()}
        onClick={(e) => e.stopPropagation()}
        className="w-full min-w-0"
      />
    </div>
  );
}

export default function SingleCard() {
  const firstRef = useRef<HTMLAudioElement>(null);
  const secondRef = useRef<HTMLAudioElement>(null);
  return (
    <div className="flex gap-3 sm:gap-4">
      <SingleItem id={SINGLE_IDS[0]} audioRef={firstRef} otherRef={secondRef} />
      <SingleItem id={SINGLE_IDS[1]} audioRef={secondRef} otherRef={firstRef} />
    </div>
  );
}
