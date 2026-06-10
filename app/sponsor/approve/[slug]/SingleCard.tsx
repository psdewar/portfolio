"use client";

import { useRef } from "react";

export default function SingleCard() {
  const audioRef = useRef<HTMLAudioElement>(null);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  return (
    <div
      onClick={toggle}
      className="flex items-stretch gap-4 overflow-hidden rounded-r-lg border border-neutral-200 dark:border-neutral-800 max-w-[400px] cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--E7719B6C-A78A-4FA3-A3856E05A0DECA92--0--5534194--Patience.jpg?fm=jpg&q=75&w=800&s=80a8ec48e54fa6a4272145fbe4f8cc8d"
        alt="Patience cover"
        className="w-24 object-cover shrink-0"
      />
      <div className="min-w-0 flex-1 py-3 pr-4 flex flex-col justify-center">
        <p className="font-medium leading-tight">Patience</p>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Peyt Spencer · © 2025 Lyrist Records
        </p>
        <audio
          ref={audioRef}
          controls
          preload="none"
          src="/api/audio/patience"
          onClick={(e) => e.stopPropagation()}
          className="w-full mt-2"
        />
      </div>
    </div>
  );
}
