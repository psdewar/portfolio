"use client";

import { createContext, useContext, useLayoutEffect, useRef } from "react";
import { posterAspect } from "../lib/poster-formats";

export const PosterHostContext = createContext<HTMLElement | null>(null);

export default function PosterSlot({ className = "" }: { className?: string }) {
  const host = useContext(PosterHostContext);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (host && ref.current && host.parentElement !== ref.current) ref.current.appendChild(host);
  }, [host]);

  return (
    <div
      ref={ref}
      data-poster-slot
      className={`relative z-[1] mx-auto shrink-0 w-full max-w-md split:hidden ${className}`}
      style={{ aspectRatio: posterAspect() }}
    />
  );
}
