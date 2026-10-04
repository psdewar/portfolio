"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { PlayIcon } from "@phosphor-icons/react";
import { getVideoMetadata } from "../lib/videos.config";
import { ClipViewer } from "./ClipViewer";

export interface EnergyVideosHandle {
  silence: () => void;
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={dir === "right" ? "M9 6l6 6-6 6" : "M15 6l-6 6 6 6"} />
    </svg>
  );
}

const GAP = 12;
const VIEWER_ID = "__viewer";
export const CLIP_MIN_H = 280;
function stepOf(el: HTMLElement) {
  const first = el.firstElementChild as HTMLElement | null;
  return first ? first.clientWidth + GAP : el.clientWidth;
}

function playIgnoringAbort(el: HTMLVideoElement) {
  el.play().catch((err) => {
    if (err.name !== "AbortError") throw err;
  });
}

const EnergyVideos = forwardRef<EnergyVideosHandle, {
  title?: string;
  videoIds: string[];
  className?: string;
  fitHeight?: boolean;
  flush?: boolean;
  expandOnPlay?: boolean;
  onLoudPlay?: () => void;
  onLoudEnd?: () => void;
}>(function EnergyVideos(
  {
    title,
    videoIds,
    className,
    fitHeight = false,
    flush = false,
    expandOnPlay = false,
    onLoudPlay,
    onLoudEnd,
  },
  outerRef,
) {
  const ref = useRef<HTMLDivElement>(null);
  const players = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [entered, setEntered] = useState(false);
  useLayoutEffect(() => {
    if (!fitHeight) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setEntered(true);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [fitHeight]);
  const [canLeft, setCanLeft] = useState(false);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState<string | null>(null);
  const [ready, setReady] = useState<Set<string>>(new Set());
  const loudClipRef = useRef<string | null>(null);
  const [viewer, setViewer] = useState<{ index: number; time: number } | null>(null);
  const viewerVideoRef = useRef<HTMLVideoElement>(null);
  const viewerTrigger = useRef<HTMLElement | null>(null);

  useImperativeHandle(outerRef, () => ({
    silence: () => {
      const id = loudClipRef.current;
      if (!id) return;
      if (id === VIEWER_ID) {
        if (viewerVideoRef.current) viewerVideoRef.current.muted = true;
        return;
      }
      const el = players.current.get(id);
      if (el) el.muted = true;
    },
  }), []);

  const onLoudEndRef = useRef(onLoudEnd);
  useEffect(() => {
    onLoudEndRef.current = onLoudEnd;
  }, [onLoudEnd]);
  useEffect(() => {
    return () => {
      if (loudClipRef.current) onLoudEndRef.current?.();
    };
  }, []);

  const clips = videoIds
    .map((id) => {
      const meta = getVideoMetadata(id);
      return meta ? { id, ...meta } : null;
    })
    .filter((c): c is NonNullable<typeof c> => !!c);

  const [canRight, setCanRight] = useState(clips.length > 1);

  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settled = useRef(0);

  const indexOf = useCallback(
    (el: HTMLElement) => {
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
      const idx = atEnd ? clips.length - 1 : Math.round(el.scrollLeft / stepOf(el));
      return Math.min(clips.length - 1, Math.max(0, idx));
    },
    [clips.length],
  );

  const sync = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    setActive(indexOf(el));
  }, [indexOf]);

  useEffect(() => {
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [sync]);

  useEffect(() => {
    if (!fitHeight) return;
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fitHeight, sync]);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.energyCard;
          if (!id || loudClipRef.current !== id) continue;
          if (entry.intersectionRatio < 0.5) {
            const el = players.current.get(id);
            if (el) el.muted = true;
          }
        }
      },
      { root, threshold: [0, 0.5] },
    );
    root.querySelectorAll<HTMLElement>("[data-energy-card]").forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [clips.length]);

  const playSilently = (id: string) => {
    const el = players.current.get(id);
    if (!el) return;
    el.muted = true;
    playIgnoringAbort(el);
  };
  const setViewerLoud = useCallback(
    (on: boolean) => {
      if (on) {
        if (loudClipRef.current === VIEWER_ID) return;
        loudClipRef.current = VIEWER_ID;
        onLoudPlay?.();
      } else if (loudClipRef.current === VIEWER_ID) {
        loudClipRef.current = null;
        onLoudEnd?.();
      }
    },
    [onLoudPlay, onLoudEnd],
  );
  const openViewer = (index: number, trigger: HTMLElement) => {
    const el = players.current.get(clips[index].id);
    viewerTrigger.current = trigger;
    setViewer({ index, time: el?.currentTime ?? 0 });
  };
  const closeViewer = () => {
    setViewerLoud(false);
    setViewer(null);
    viewerTrigger.current?.focus();
  };
  const playWithSound = (id: string) => {
    const el = players.current.get(id);
    if (!el) return;
    el.muted = false;
    playIgnoringAbort(el);
  };

  const onStripScroll = () => {
    sync();
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const idx = indexOf(el);
      if (idx === settled.current) return;
      settled.current = idx;
      const clip = clips[idx];
      if (clip && !fitHeight) playSilently(clip.id);
    }, 160);
  };

  const maxIndex = clips.length - 1;
  const nudge = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    const step = stepOf(el);
    const current = Math.round(el.scrollLeft / step);
    const target = Math.min(maxIndex, Math.max(0, current + dir));
    el.scrollTo({ left: target * step, behavior: "smooth" });
    settled.current = target;
    const clip = clips[target];
    if (clip && !fitHeight) playSilently(clip.id);
  };

  function handleVideoPlay(id: string, el: HTMLVideoElement) {
    setPlaying(id);
    if (!el.muted) {
      loudClipRef.current = id;
      onLoudPlay?.();
    }
    players.current.forEach((p, pid) => {
      if (pid !== id) {
        p.pause();
        p.currentTime = 0;
      }
    });
  }
  function handleLoudEndFor(id: string) {
    if (loudClipRef.current !== id) return;
    loudClipRef.current = null;
    onLoudEnd?.();
  }

  if (!clips.length) return null;

  const glass =
    "absolute top-1/2 -translate-y-1/2 z-10 grid place-items-center w-10 h-10 rounded-full " +
    "bg-white/45 dark:bg-neutral-900/40 backdrop-blur-xl ring-1 ring-black/[0.06] dark:ring-white/15 " +
    "shadow-lg shadow-black/10 text-neutral-900 dark:text-white transition duration-200 " +
    "hover:bg-white/65 dark:hover:bg-neutral-900/60 active:scale-90";

  return (
    <div
      className={`flex flex-col min-h-0 ${
        fitHeight ? `transition-transform duration-700 ease-out ${entered ? "translate-x-0" : "translate-x-[140px]"}` : ""
      } ${className ?? ""}`}
    >
      {title && (
        <div className="flex items-center gap-2 mb-2">
          <h3 className="text-xs text-neutral-400 uppercase tracking-wider">{title}</h3>
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

      <div className={`relative ${fitHeight ? "flex-1 min-h-0" : ""}`}>
        <div
          ref={ref}
          onScroll={onStripScroll}
          className={`flex ${flush ? "gap-0" : "gap-3"} overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            fitHeight ? "h-full" : "pb-2"
          }`}
        >
          {clips.map((clip, i) => (
            <div
              key={clip.id}
              data-energy-card={clip.id}
              className={`group relative bg-black overflow-hidden ${flush ? "" : "rounded-lg"} ${
                fitHeight && i === clips.length - 1 ? "snap-end" : "snap-start"
              } shrink-0 ${fitHeight ? "h-full" : "w-[300px] max-w-[78vw]"}`}
              style={{ aspectRatio: "9 / 16", minHeight: CLIP_MIN_H }}
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
                onPlay={(e) => handleVideoPlay(clip.id, e.currentTarget)}
                onPlaying={() => setReady((s) => (s.has(clip.id) ? s : new Set(s).add(clip.id)))}
                onPause={() => handleLoudEndFor(clip.id)}
                onEnded={() => handleLoudEndFor(clip.id)}
                onVolumeChange={(e) => {
                  const el = e.currentTarget;
                  if (el.paused) return;
                  if (el.muted && loudClipRef.current === clip.id) {
                    handleLoudEndFor(clip.id);
                  } else if (!el.muted && loudClipRef.current !== clip.id) {
                    loudClipRef.current = clip.id;
                    onLoudPlay?.();
                  }
                }}
              />
              {playing !== clip.id && (
                <button
                  type="button"
                  onClick={(e) => (expandOnPlay ? openViewer(i, e.currentTarget) : playWithSound(clip.id))}
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
          {!fitHeight && <div aria-hidden className="shrink-0 w-[min(calc(100%-312px),320px)]" />}
        </div>

        {fitHeight && canLeft && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-black/50 to-transparent" />
        )}
        {fitHeight && canRight && (
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-black/50 to-transparent" />
        )}

        {!fitHeight && canLeft && (
          <button type="button" onClick={() => nudge(-1)} aria-label="Previous videos" className={`${glass} left-2`}>
            <Chevron dir="left" />
          </button>
        )}
        {!fitHeight && canRight && (
          <button type="button" onClick={() => nudge(1)} aria-label="More videos" className={`${glass} right-2`}>
            <Chevron dir="right" />
          </button>
        )}
      </div>
      {viewer && (
        <ClipViewer
          clips={clips}
          startIndex={viewer.index}
          startTime={viewer.time}
          videoRef={viewerVideoRef}
          onLoud={setViewerLoud}
          onClose={closeViewer}
        />
      )}
    </div>
  );
});

export default EnergyVideos;
