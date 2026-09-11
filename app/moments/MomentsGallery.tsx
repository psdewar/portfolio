"use client";

import { useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { CameraIcon, MusicNoteIcon } from "@phosphor-icons/react";
import posthog from "posthog-js";
import type { GalleryItem } from "../api/shared/moments";
import { formatShortDate } from "../lib/dates";
import { useSunLights } from "../hooks/useSunLights";

// Full-res URLs are signed on demand and remembered for the session; the
// featured payload itself stays stable so it can cache until an admin change.
const viewUrls = new Map<string, Promise<string | null>>();
function fetchView(key: string): Promise<string | null> {
  let p = viewUrls.get(key);
  if (!p) {
    p = fetch(`/api/moments/view?key=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => (d && typeof d.url === "string" ? d.url : null))
      .catch(() => null);
    viewUrls.set(key, p);
  }
  return p;
}

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;
const SCROLL_SPEED = 0.15;
const RESUME_DELAY_MS = 5000;
const START_PAUSE_MS = 1000;
const roadFill = "#3a3d45";

function wrap(x: number, half: number, base = half) {
  if (half <= 0) return x;
  let v = x;
  while (v >= base + half) v -= half;
  while (v < base) v += half;
  return v;
}

function tileSizes(item: { w?: number; h?: number }): string {
  return item.w && item.h ? `${Math.round((item.w / item.h) * 40)}svh` : "40svh";
}

function tileCenter(el: HTMLDivElement, copy: number, index: number): number {
  const tile = el.querySelector<HTMLElement>(`[data-copy="${copy}"] [data-tile="${index}"]`);
  if (!tile) return 0;
  return tile.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft + tile.offsetWidth / 2;
}

function MomentsGallery({
  items,
  og = false,
  onCarClick,
  playerOpen = false,
  playing = false,
}: {
  items: GalleryItem[];
  og?: boolean;
  onCarClick?: () => void;
  playerOpen?: boolean;
  playing?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const lights = useSunLights() ?? "off";
  const [motion, setMotion] = useState<"forward" | "stopped" | "reverse">("forward");

  const scrollRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const setWidth = useRef(0);
  const offset = useRef(0);
  const paused = useRef(false);
  const treadRef = useRef<SVGPatternElement>(null);
  const roadRef = useRef<HTMLDivElement>(null);
  const yellowRef = useRef<HTMLDivElement>(null);
  const laps = useRef(0);
  const viewCenter = useRef(0);
  const lead = useRef(0);
  const rafId = useRef<number | null>(null);
  const lastTs = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const motionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);
  const firstReady = useRef(false);
  const lightboxOpen = useRef(false);
  const inView = useRef(true);
  const openedAt = useRef<number | null>(null);
  const groups: Array<{
    stop?: { city: string; visit?: string };
    tiles: Array<{ item: GalleryItem; index: number }>;
  }> = [];
  {
    let lastBoundary = "";
    items.forEach((it, i) => {
      const boundary = it.city ? `${it.city}|${it.visit ?? ""}` : "";
      if (groups.length === 0 || (boundary && boundary !== lastBoundary)) {
        groups.push({ stop: it.city ? { city: it.city, visit: it.visit } : undefined, tiles: [] });
        lastBoundary = boundary;
      }
      groups[groups.length - 1].tiles.push({ item: it, index: i });
    });
  }

  useEffect(() => {
    lightboxOpen.current = open !== null;
  }, [open]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting;
        if (entry.isIntersecting) lastTs.current = 0;
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = setRef.current;
    if (!el) return;
    const measure = () => {
      setWidth.current = el.offsetWidth;
      const strip = scrollRef.current;
      if (strip) viewCenter.current = strip.clientWidth / 2;
      if (!initialized.current && setWidth.current > 0 && strip) {
        const firstTile = el.querySelector<HTMLElement>('[data-tile="0"]');
        lead.current = Math.max(0, viewCenter.current - (firstTile?.offsetWidth ?? 0) / 2);
        const start = setWidth.current - lead.current;
        scrollRef.current.scrollLeft = start;
        offset.current = start;
        initialized.current = true;
      }
      for (const sign of strip?.querySelectorAll<HTMLElement>("[data-sign]") ?? []) sign.style.setProperty("--lw", `${sign.offsetWidth}px`);
      const w = setWidth.current;
      if (roadRef.current && w > 0) {
        const d = w / Math.round(w / 120);
        const on = (d / 4).toFixed(2);
        roadRef.current.style.backgroundImage = `repeating-linear-gradient(90deg, #8f939a 0 ${on}px, transparent ${on}px ${d.toFixed(2)}px)`;
        roadRef.current.style.backgroundSize = `${w}px 2px`;
        roadRef.current.style.backgroundPositionY = "2px";
      }
      if (yellowRef.current && w > 0) yellowRef.current.style.width = `${w}px`;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    for (const sign of el.querySelectorAll<HTMLElement>("[data-sign]")) ro.observe(sign);
    if (scrollRef.current) ro.observe(scrollRef.current);
    return () => ro.disconnect();
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;

    const timer = setTimeout(() => {
      firstReady.current = true;
    }, START_PAUSE_MS);

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return () => clearTimeout(timer);
    }

    const step = (ts: number) => {
      const delta = lastTs.current ? Math.min(ts - lastTs.current, 16) : 16;
      lastTs.current = ts;

      const el = scrollRef.current;
      const w = setWidth.current;
      if (el && w > 0 && initialized.current && firstReady.current && inView.current && !lightboxOpen.current && !paused.current) {
        const raw = offset.current + delta * SCROLL_SPEED;
        offset.current = wrap(raw, w, w - lead.current);
        laps.current += Math.round((raw - offset.current) / w);
        el.scrollLeft = offset.current;
        paintCar();
      }
      rafId.current = requestAnimationFrame(step);
    };

    rafId.current = requestAnimationFrame(step);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      clearTimeout(timer);
      lastTs.current = 0;
    };
  }, [items]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      if (motionTimer.current) clearTimeout(motionTimer.current);
    };
  }, []);

  const pause = () => {
    if (!paused.current) {
      setMotion("stopped");
      if (motionTimer.current) clearTimeout(motionTimer.current);
    }
    paused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
  };

  const scheduleResume = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      if (scrollRef.current) offset.current = scrollRef.current.scrollLeft;
      lastTs.current = 0;
      paused.current = false;
      setMotion("forward");
    }, RESUME_DELAY_MS);
  };

  const paintCar = () => {
    treadRef.current?.setAttribute("patternTransform", `translate(${((offset.current / 2) % 4).toFixed(2)} 0)`);
    const w = setWidth.current;
    if (w <= 0) return;
    if (roadRef.current) roadRef.current.style.backgroundPositionX = `${(-offset.current).toFixed(2)}px`;
    if (yellowRef.current) yellowRef.current.style.transform = `translateX(${((1 - laps.current) * w - offset.current).toFixed(2)}px)`;
  };

  const applyWrap = () => {
    const el = scrollRef.current;
    const w = setWidth.current;
    if (!el || w <= 0) return;
    const wrapped = wrap(el.scrollLeft, w, w - lead.current);
    laps.current += Math.round((el.scrollLeft - wrapped) / w);
    if (wrapped !== el.scrollLeft) el.scrollLeft = wrapped;
    offset.current = el.scrollLeft;
    paintCar();
  };

  const onScroll = () => {
    if (!paused.current) return;
    const el = scrollRef.current;
    const w = setWidth.current;
    if (!el || w <= 0) return;
    const delta = el.scrollLeft - offset.current;
    const nearEdge =
      el.scrollLeft < w * 0.2 || el.scrollLeft > w * 3 - el.clientWidth - w * 0.2;
    if (nearEdge) {
      applyWrap();
    } else {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(applyWrap, 150);
    }
    offset.current = el.scrollLeft;
    if (delta !== 0 && Math.abs(delta) < w / 2) {
      setMotion(delta > 0 ? "forward" : "reverse");
      if (motionTimer.current) clearTimeout(motionTimer.current);
      motionTimer.current = setTimeout(() => setMotion("stopped"), 160);
    }
    paintCar();
    scheduleResume();
  };

  const stepStrip = (dir: 1 | -1) => {
    const el = scrollRef.current;
    const w = setWidth.current;
    if (!el || w <= 0) return;
    const x = el.scrollLeft + viewCenter.current;
    const stripLeft = el.getBoundingClientRect().left - el.scrollLeft;
    let cur = 0;
    let copy = 1;
    for (const tile of el.querySelectorAll<HTMLElement>("[data-tile]")) {
      const left = tile.getBoundingClientRect().left - stripLeft;
      if (x >= left && x < left + tile.offsetWidth) {
        cur = Number(tile.dataset.tile);
        copy = Number(tile.closest<HTMLElement>("[data-copy]")?.dataset.copy ?? 1);
        break;
      }
    }
    const next = (cur + dir + items.length) % items.length;
    const nextCopy = next === cur + dir ? copy : copy + dir;
    const center = tileCenter(el, nextCopy, next);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    pause();
    el.scrollTo({ left: center - viewCenter.current, behavior: reducedMotion ? "auto" : "smooth" });
    scheduleResume();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightboxOpen.current || !inView.current) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepStrip(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepStrip(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [items]);

  const handleOpen = (index: number) => {
    openedAt.current = index;
    setOpen(index);
  };

  const closeLightbox = () => {
    const el = scrollRef.current;
    if (el && open !== null && open !== openedAt.current) {
      pause();
      el.scrollLeft = tileCenter(el, 1, open) - viewCenter.current;
      applyWrap();
      scheduleResume();
    }
    setOpen(null);
  };

  const stepLightbox = (dir: 1 | -1) => {
    setOpen((i) => (i === null ? i : (i + dir + items.length) % items.length));
  };

  const lampFill = lights === "off" ? "#a9adb5" : "#ffffff";
  const braking = open !== null || motion === "stopped";
  const reversing = open === null && motion === "reverse";
  const tailFill = braking ? "#ffd6d6" : reversing ? "#ffffff" : lights === "off" ? "#7d2222" : "#ff5a5a";

  if (og) {
    return (
      <section aria-label="Moment" className="relative mx-[calc(50%-50vw)] w-screen shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/api/og/moments" alt="" className="h-[40svh] w-screen object-cover" />
      </section>
    );
  }

  if (items.length === 0) return null;

  const mediaOrigin = items[0].src ? new URL(items[0].src).origin : null;

  return (
    <section aria-label="Moments from the night" className="relative mx-[calc(50%-50vw)] w-screen shrink-0">
      {mediaOrigin && <link rel="preconnect" href={mediaOrigin} crossOrigin="" />}
      <style>{`@keyframes momentRise{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}@keyframes momentFade{from{opacity:0}to{opacity:1}}@keyframes momentNote{0%{opacity:0;transform:translateY(4px) scale(.8)}20%{opacity:1}100%{opacity:0;transform:translateY(-14px) scale(1.05)}}.moments-strip::-webkit-scrollbar{display:none}@media (prefers-reduced-motion: reduce){.moments-note{animation:none!important;opacity:1}}`}</style>

      <div
        ref={scrollRef}
        className="moments-strip flex h-[calc(40svh+56px)] overflow-x-auto overflow-y-hidden overscroll-x-contain"
        style={{ scrollbarWidth: "none" }}
        onPointerDown={pause}
        onPointerUp={scheduleResume}
        onPointerCancel={scheduleResume}
        onWheel={() => {
          pause();
          scheduleResume();
        }}
        onScroll={onScroll}
      >
        {[0, 1, 2].map((copy) => (
          <div key={copy} ref={copy === 0 ? setRef : undefined} data-copy={copy} className="relative flex h-full flex-none">
            {groups.map((g, gi) => (
              <div key={`${copy}-${gi}`} data-group className="relative flex h-full flex-none">
                {g.tiles.map((e) => (
                  <div key={`${copy}-${e.item.key}`} data-tile={e.index} className="relative flex flex-none flex-col">
                    <Tile
                      item={e.item}
                      decorative={copy !== 0}
                      priority={copy === 0 && e.index === 0}
                      index={e.index}
                      onOpen={handleOpen}
                    />
                    <div className="h-14" style={{ background: roadFill }} />
                  </div>
                ))}
                {g.stop && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14">
                    <div
                      data-sign
                      className="sticky flex h-[27px] w-fit items-center px-3 pt-[2px]"
                      style={{ left: "calc(50vw - var(--lw, 0px) / 2)" }}
                    >
                      <Stop city={g.stop.city} visit={g.stop.visit} count={g.tiles.length} />
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-[2px] bg-white/60" />
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-[40svh] z-[3] h-[3px]">
        <div className="absolute inset-x-0 top-0 h-[2px] bg-white/60" />
        <div
          ref={roadRef}
          aria-hidden
          className="absolute inset-x-0 top-[25px] h-[6px]"
          style={{ backgroundRepeat: "repeat-x" }}
        />
        <div
          ref={yellowRef}
          aria-hidden
          className="absolute left-0 top-[25px] h-[6px]"
          style={{ background: `linear-gradient(180deg, #e0b53c 0 2px, ${roadFill} 2px 4px, #e0b53c 4px 6px)` }}
        />
        <button
          type="button"
          onClick={onCarClick}
          disabled={!onCarClick}
          aria-label={playing ? "Music playing" : playerOpen ? "Music player open" : "Play my music"}
          className="pointer-events-auto absolute left-1/2 top-[19.5px] flex h-8 w-16 -translate-x-1/2 items-end justify-center overflow-visible disabled:pointer-events-none"
        >
        {onCarClick && (!playerOpen || playing) && (
          <>
            <MusicNoteIcon
              weight="fill"
              size={12}
              className="moments-note pointer-events-none absolute left-[38px] top-[20px] text-white"
              style={{ animation: "momentNote 2.2s ease-out infinite" }}
            />
            <MusicNoteIcon
              weight="fill"
              size={12}
              className="moments-note pointer-events-none absolute left-[44px] top-[23px] text-white"
              style={{ animation: "momentNote 2.2s ease-out 1.1s infinite" }}
            />
          </>
        )}
        <svg
          viewBox="0 0 46 18"
          width="46"
          height="18"
          aria-hidden="true"
          className="overflow-visible"
        >
          <defs>
            <pattern ref={treadRef} id="tread" patternUnits="userSpaceOnUse" width="4" height="4">
              <rect width="4" height="4" fill="#141416" />
              <rect x="1.2" width="1.6" height="4" fill="#6b6e75" />
            </pattern>
            <linearGradient id="beam-low" x1="0" x2="1">
              <stop offset="0" stopColor="#fff1b8" stopOpacity=".55" />
              <stop offset=".7" stopColor="#fff1b8" stopOpacity=".3" />
              <stop offset="1" stopColor="#fff1b8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="beam-high" x1="0" x2="1">
              <stop offset="0" stopColor="#f2f7ff" stopOpacity=".7" />
              <stop offset=".35" stopColor="#f2f7ff" stopOpacity=".3" />
              <stop offset="1" stopColor="#f2f7ff" stopOpacity="0" />
            </linearGradient>
            <radialGradient id="lamp-glow">
              <stop offset="0" stopColor="#fff" stopOpacity=".9" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="brake-glow">
              <stop offset="0" stopColor="#ff3b3b" stopOpacity=".85" />
              <stop offset="1" stopColor="#ff3b3b" stopOpacity="0" />
            </radialGradient>
          </defs>
          {lights === "low" ? (
            <>
              <path d="M44.6 3.9L78 -3V11.5L44.6 5.7Z" fill="url(#beam-low)" />
              <path d="M44.6 10.3L78 4.5V19L44.6 12.1Z" fill="url(#beam-low)" />
            </>
          ) : null}
          {lights === "high" ? (
            <>
              <path d="M44.6 3.9L124 -4V11.5L44.6 5.7Z" fill="url(#beam-high)" />
              <path d="M44.6 10.3L124 4.5V20L44.6 12.1Z" fill="url(#beam-high)" />
            </>
          ) : null}
          <rect x="2" y="3.5" width="44" height="13.5" rx="3.5" fill="rgba(0,0,0,.35)" />
          <g fill="url(#tread)">
            <rect x="4.5" y="0" width="8" height="3.6" rx="0.9" />
            <rect x="4.5" y="12.4" width="8" height="3.6" rx="0.9" />
            <rect x="34.5" y="0" width="8" height="3.6" rx="0.9" />
            <rect x="34.5" y="12.4" width="8" height="3.6" rx="0.9" />
          </g>
          <rect x="29.8" y="0.9" width="2.4" height="1.6" rx="0.5" fill="#1c1c1e" />
          <rect x="29.8" y="13.5" width="2.4" height="1.6" rx="0.5" fill="#1c1c1e" />
          <path
            d="M3.5 2H41.5Q45 2 45 5.5V10.5Q45 14 41.5 14H3.5Q1 14 1 11.5V4.5Q1 2 3.5 2Z"
            fill="#c8202b"
            stroke="#7a0f18"
            strokeWidth="0.6"
          />
          <path d="M4 2.8H41Q43.6 2.8 44.2 5" fill="none" stroke="#ef5560" strokeWidth="0.7" strokeLinecap="round" />
          <path d="M4 13.2H41Q43.6 13.2 44.2 11" fill="none" stroke="#8c121c" strokeWidth="0.7" strokeLinecap="round" />
          <path d="M39 2.7V13.3M6.5 2.7V13.3" stroke="#8c121c" strokeWidth="0.5" />
          <rect x="11" y="3.4" width="20" height="9.2" rx="1" fill="#17181b" />
          <path d="M31.5 3.6H33.5Q36.4 4.6 37 8Q36.4 11.4 33.5 12.4H31.5Z" fill="#17181b" />
          <path d="M10.5 3.6V12.4H8.8Q7.9 8 8.8 3.6Z" fill="#17181b" />
          <path d="M32.6 4.6L35.2 5.6M32.8 11.4L35.4 10.4" stroke="rgba(255,255,255,.35)" strokeWidth="0.6" strokeLinecap="round" />
          {lights !== "off" ? (
            <>
              <circle cx="44" cy="4.8" r="2.6" fill="url(#lamp-glow)" />
              <circle cx="44" cy="11.2" r="2.6" fill="url(#lamp-glow)" />
            </>
          ) : null}
          <rect x="43.2" y="3.6" width="1.4" height="2.4" rx="0.5" fill={lampFill} />
          <rect x="43.2" y="10" width="1.4" height="2.4" rx="0.5" fill={lampFill} />
          {braking ? (
            <>
              <ellipse cx="0" cy="8" rx="9" ry="7" fill="url(#brake-glow)" opacity=".45" />
              <circle cx="2" cy="4.8" r="3.2" fill="url(#brake-glow)" />
              <circle cx="2" cy="11.2" r="3.2" fill="url(#brake-glow)" />
            </>
          ) : null}
          {reversing ? (
            <>
              <circle cx="2" cy="4.8" r="2.6" fill="url(#lamp-glow)" />
              <circle cx="2" cy="11.2" r="2.6" fill="url(#lamp-glow)" />
            </>
          ) : null}
          <rect x="1.4" y="3.6" width="1.2" height="2.4" rx="0.5" style={{ fill: tailFill, transition: "fill .3s" }} />
          <rect x="1.4" y="10" width="1.2" height="2.4" rx="0.5" style={{ fill: tailFill, transition: "fill .3s" }} />
        </svg>
        </button>
      </div>

      {open !== null && (
        <Lightbox
          items={items}
          index={open}
          group={groups.find((g) => g.tiles.some((t) => t.index === open))}
          onClose={closeLightbox}
          onStep={stepLightbox}
        />
      )}
    </section>
  );
}

export default MomentsGallery;

function Stop({ city, visit, count, position }: { city: string; visit?: string; count: number; position?: number }) {
  return (
    <div
      aria-hidden
      className="flex items-center gap-2 whitespace-nowrap font-bold uppercase tracking-wide"
      style={{ fontFamily: "var(--font-parkinsans), sans-serif", animation: "momentFade .3s ease-out" }}
    >
      <span className="text-base leading-none text-white">{city}</span>
      {visit && <span className="text-base leading-none text-[#b8bec8]">{formatShortDate(visit)}</span>}
      <span className="flex items-center gap-1 text-base leading-none text-white">
        <CameraIcon weight="fill" size={16} className="-translate-y-[0.6px]" />
        {position ? `${position}/${count}` : count}
      </span>
    </div>
  );
}

function Tile({
  item,
  decorative,
  priority,
  index,
  onOpen,
}: {
  item: GalleryItem;
  decorative?: boolean;
  priority?: boolean;
  index: number;
  onOpen: (index: number) => void;
}) {
  const isVideo = VIDEO_EXT.test(item.key);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  const hasDims = !!(item.w && item.h);
  const mediaClass = `transition-[transform,opacity] duration-500 ease-out group-hover:scale-[1.04] ${
    hasDims ? "h-full w-full object-cover" : "h-full w-auto"
  }`;
  const sizes = tileSizes(item);

  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  const trackError = () => {
    if (!decorative) posthog.capture("moment_media_error", { key: item.key });
  };

  function playHover() {
    const el = videoRef.current;
    if (!el) return;
    if (el.src) {
      el.play().catch(() => {});
      return;
    }
    fetchView(item.key).then((u) => {
      const v = videoRef.current;
      if (!u || !v) return;
      if (!v.src) v.src = u;
      v.play().catch(() => {});
    });
  }
  function pauseHover() {
    videoRef.current?.pause();
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(index)}
      onMouseEnter={playHover}
      onMouseLeave={pauseHover}
      aria-label={isVideo ? "Play moment" : "View moment"}
      aria-hidden={decorative || undefined}
      tabIndex={decorative ? -1 : undefined}
      className="group relative h-[40svh] flex-none overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d4a553]"
      style={{ aspectRatio: hasDims ? `${item.w} / ${item.h}` : undefined }}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          poster={item.src}
          muted
          loop
          playsInline
          preload="none"
          className={mediaClass}
          onError={trackError}
        />
      ) : (
        <img
          ref={imgRef}
          src={item.src}
          srcSet={item.srcSet}
          sizes={item.srcSet ? sizes : undefined}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          className={`${mediaClass} ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={trackError}
        />
      )}

      {isVideo && (
        <span className="pointer-events-none absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition-opacity group-hover:opacity-0">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      )}
    </button>
  );
}

function Lightbox({
  items,
  index,
  group,
  onClose,
  onStep,
}: {
  items: GalleryItem[];
  index: number;
  group?: { stop?: { city: string; visit?: string }; tiles: Array<{ index: number }> };
  onClose: () => void;
  onStep: (dir: 1 | -1) => void;
}) {
  const item = items[index];
  const isVideo = VIDEO_EXT.test(item.key);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);
  const startT = useRef(0);
  const [full, setFull] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
    setFull(null);
    fetchView(item.key).then((u) => {
      if (on && u) setFull(u);
    });
    return () => {
      on = false;
    };
  }, [item.key]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onStep(1);
      else if (e.key === "ArrowLeft") onStep(-1);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose, onStep]);

  const onTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    startX.current = e.touches[0].clientX;
    startY.current = e.touches[0].clientY;
    startT.current = Date.now();
    setDragging(true);
  };
  const onTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (startX.current === null || startY.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;
    setDragY(Math.abs(dy) >= Math.abs(dx) ? dy : 0);
  };
  const onTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (startX.current === null || startY.current === null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = dragY;
    const velocity = Math.abs(dy) / Math.max(Date.now() - startT.current, 1);
    startX.current = null;
    startY.current = null;
    setDragging(false);
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      setDragY(0);
      onStep(dx < 0 ? 1 : -1);
    } else if (Math.abs(dy) > 110 || velocity > 0.6) {
      onClose();
    } else {
      setDragY(0);
    }
  };

  const fade = Math.min(Math.abs(dragY) / 600, 0.9);

  return (
    <div
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{
        backgroundColor: `rgba(0,0,0,${(0.92 * (1 - fade)).toFixed(3)})`,
        animation: "momentFade .2s ease both",
      }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.25s ease",
        }}
      >
        {isVideo && full ? (
          <video
            key={item.key}
            src={full}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-lg shadow-2xl"
            style={{ animation: "momentRise .25s ease both" }}
          />
        ) : (
          <img
            key={item.key}
            src={(isVideo ? item.src : full ?? item.src) ?? undefined}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            style={{ animation: "momentRise .25s ease both" }}
          />
        )}
        {group?.stop && (
          <div className="pointer-events-none absolute inset-x-0 -bottom-8 flex justify-center">
            <Stop
              city={group.stop.city}
              visit={group.stop.visit}
              count={group.tiles.length}
              position={group.tiles.findIndex((t) => t.index === index) + 1}
            />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      {items.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            aria-label="Previous moment"
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            aria-label="Next moment"
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}
