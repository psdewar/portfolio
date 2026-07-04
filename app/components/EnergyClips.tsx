"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type EnergyClip = { label: string; src: string; poster?: string };

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
    </svg>
  );
}

export default function EnergyClips({ title, clips }: { title?: string; clips: EnergyClip[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const videos = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(clips.length > 1);
  const [active, setActive] = useState(0);
  const [started, setStarted] = useState<Set<string>>(() => new Set());

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(!atEnd);
    const first = el.firstElementChild as HTMLElement | null;
    const step = first ? first.clientWidth + 12 : el.clientWidth;
    const idx = atEnd ? clips.length - 1 : Math.round(el.scrollLeft / step);
    setActive(Math.min(clips.length - 1, Math.max(0, idx)));
  }, [clips.length]);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (!clips.length) return null;

  const glass =
    "absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full " +
    "bg-white/45 dark:bg-neutral-900/40 backdrop-blur-xl ring-1 ring-black/[0.06] dark:ring-white/15 " +
    "shadow-lg shadow-black/10 text-neutral-900 dark:text-white transition duration-200 " +
    "hover:bg-white/65 dark:hover:bg-neutral-900/60 active:scale-90";

  return (
    <div>
      {(title || clips.length > 1) && (
        <div className="flex items-center gap-2 mb-2">
          {title && <h3 className="text-xs text-neutral-400 uppercase tracking-wider">{title}</h3>}
          {clips.length > 1 && (
            <div className="flex items-center gap-1" aria-hidden>
              {clips.map((c, i) => (
                <span
                  key={c.label}
                  className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    i === active ? "bg-neutral-500 dark:bg-neutral-300" : "bg-neutral-300 dark:bg-neutral-700"
                  }`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <div
          ref={ref}
          onScroll={sync}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {clips.map((clip, i) => (
            <figure
              key={clip.label}
              className="relative snap-start shrink-0 w-[300px] max-w-[78vw] bg-neutral-900 rounded-lg overflow-hidden"
              style={{ aspectRatio: "9 / 16" }}
            >
              <video
                ref={(el) => {
                  if (el) videos.current.set(clip.label, el);
                  else videos.current.delete(clip.label);
                }}
                src={clip.src}
                poster={clip.poster}
                className="w-full h-full object-contain"
                controls
                playsInline
                loop
                preload="none"
                onPlay={() => {
                  setStarted((s) => new Set(s).add(clip.label));
                  setActive(i);
                  videos.current.forEach((v, label) => {
                    if (label !== clip.label) v.pause();
                  });
                }}
              />
              {!started.has(clip.label) && (
                <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 px-3 pb-2.5 pt-10 bg-gradient-to-t from-black/80 to-transparent text-sm font-semibold leading-snug text-white line-clamp-2">
                  {clip.label}
                </figcaption>
              )}
            </figure>
          ))}
          <div aria-hidden className="shrink-0 w-[min(calc(100%-312px),320px)]" />
        </div>

        {canLeft && (
          <button type="button" onClick={() => nudge(-1)} aria-label="Previous clips" className={`${glass} left-2`}>
            <Chevron dir="left" />
          </button>
        )}
        {canRight && (
          <button type="button" onClick={() => nudge(1)} aria-label="More clips" className={`${glass} right-2`}>
            <Chevron dir="right" />
          </button>
        )}
      </div>
    </div>
  );
}
