"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PlayIcon } from "@phosphor-icons/react";
import { getVideoMetadata } from "../lib/videos.config";

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
    </svg>
  );
}

const GAP = 12;
function stepOf(el: HTMLElement) {
  const first = el.firstElementChild as HTMLElement | null;
  return first ? first.clientWidth + GAP : el.clientWidth;
}

export default function EnergyVideos({ title, videoIds }: { title?: string; videoIds: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const players = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [canLeft, setCanLeft] = useState(false);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [ready, setReady] = useState<Set<string>>(new Set());

  const clips = videoIds
    .map((id) => {
      const meta = getVideoMetadata(id);
      return meta ? { id, ...meta } : null;
    })
    .filter((c): c is NonNullable<typeof c> => !!c);

  const [canRight, setCanRight] = useState(clips.length > 1);

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(!atEnd);
    const step = stepOf(el);
    const idx = atEnd ? clips.length - 1 : Math.round(el.scrollLeft / step);
    setActive(Math.min(clips.length - 1, Math.max(0, idx)));
  }, [clips.length]);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  const play = (id: string) => players.current.get(id)?.play().catch(() => {});

  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const step = stepOf(el);
    const current = Math.round(el.scrollLeft / step);
    const target = Math.min(clips.length - 1, Math.max(0, current + dir));
    el.scrollTo({ left: target * step, behavior: "smooth" });
    const clip = clips[target];
    if (clip) play(clip.id);
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
              {clips.map((clip, i) => (
                <span
                  key={clip.id}
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
          {clips.map((clip) => (
            <div
              key={clip.id}
              className="group relative snap-start shrink-0 w-[300px] max-w-[78vw] bg-black rounded-lg overflow-hidden"
              style={{ aspectRatio: "9 / 16" }}
            >
              {clip.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clip.thumbnail}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-[400ms] ease-out group-hover:scale-[1.03]"
                />
              )}
              <video
                ref={(el) => {
                  if (el) players.current.set(clip.id, el);
                  else players.current.delete(clip.id);
                }}
                src={clip.src}
                poster={clip.thumbnail}
                className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-200 ${
                  playing === clip.id && ready.has(clip.id) ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                controls={playing === clip.id}
                playsInline
                loop
                preload="none"
                onPlay={() => {
                  setPlaying(clip.id);
                  players.current.forEach((p, id) => {
                    if (id !== clip.id) {
                      p.pause();
                      p.currentTime = 0;
                    }
                  });
                }}
                onPlaying={() => setReady((s) => (s.has(clip.id) ? s : new Set(s).add(clip.id)))}
              />
              {playing !== clip.id && (
                <button
                  type="button"
                  onClick={() => play(clip.id)}
                  aria-label={clip.title ? `Play ${clip.title}` : "Play clip"}
                  className="absolute inset-0"
                >
                  <span className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.6)_0%,rgba(0,0,0,0)_46%)]" />
                  <span className="absolute left-1/2 top-1/2 flex h-[62px] w-[62px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/90 bg-black/45 text-white transition-[background-color,border-color,transform] duration-200 group-hover:scale-[1.06] group-hover:border-[#d4a553] group-hover:bg-[#d4a553]">
                    <PlayIcon size={28} weight="fill" className="ml-[3px]" />
                  </span>
                </button>
              )}
            </div>
          ))}
          <div aria-hidden className="shrink-0 w-[min(calc(100%-312px),320px)]" />
        </div>

        {canLeft && (
          <button type="button" onClick={() => nudge(-1)} aria-label="Previous videos" className={`${glass} left-2`}>
            <Chevron dir="left" />
          </button>
        )}
        {canRight && (
          <button type="button" onClick={() => nudge(1)} aria-label="More videos" className={`${glass} right-2`}>
            <Chevron dir="right" />
          </button>
        )}
      </div>
    </div>
  );
}
