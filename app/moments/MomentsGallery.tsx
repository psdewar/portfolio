"use client";

import { memo, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { preconnect } from "react-dom";
import posthog from "posthog-js";

interface FeaturedItem {
  key: string;
  url: string;
  thumb?: string;
  w?: number;
  h?: number;
}

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;
const SCROLL_SPEED = 0.06; // px per ms (~1px per frame at 60fps)
const RESUME_DELAY_MS = 5000;
const FADE_MS = 700;
const STAGGER_MS = 70;
const START_PAUSE_MS = 1000;
const READY_FALLBACK_MS = 4000;
const SLOW_LOAD_MS = 2500;

function wrap(x: number, half: number) {
  if (half <= 0) return x;
  let v = x;
  while (v >= half * 2) v -= half;
  while (v < half) v += half;
  return v;
}

function MomentsGallery() {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [open, setOpen] = useState<FeaturedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [ogMode, setOgMode] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const setWidth = useRef(0);
  const offset = useRef(0);
  const lastScroll = useRef(0);
  const paused = useRef(false);
  const rafId = useRef<number | null>(null);
  const lastTs = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);
  const dir = useRef(1);
  const barRef = useRef<HTMLDivElement>(null);
  const cycleStart = useRef(0);
  const firstReady = useRef(false);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lightboxOpen = useRef(false);
  const pendingDims = useRef<Record<string, [number, number]>>({});
  const dimsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // OG capture: skip the slider entirely and show one static moment, so the
    // page screenshot is fast and doesn't wait on the whole gallery loading.
    if (new URLSearchParams(window.location.search).get("og") === "true") {
      setOgMode(true);
      setLoading(false);
      return;
    }
    let active = true;
    fetch("/api/moments/featured")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (!active) return;
        const next: FeaturedItem[] = Array.isArray(data.items) ? data.items : [];
        const first = next[0]?.thumb ?? next[0]?.url;
        if (first) {
          try {
            preconnect(new URL(first).origin);
          } catch {}
        }
        setItems(next);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const imgSig = items
    .filter((it) => !VIDEO_EXT.test(it.key))
    .map((it) => it.thumb ?? it.url)
    .sort()
    .join("\n");

  useEffect(() => {
    setRevealed(false);
    if (!imgSig) {
      setRevealed(true);
      return;
    }
    const urls = imgSig.split("\n");
    let active = true;
    let loaded = 0;
    const done = () => {
      if (active && ++loaded >= urls.length) setRevealed(true);
    };
    for (const u of urls) {
      const img = new Image();
      img.onload = done;
      img.onerror = done;
      img.src = u;
    }
    const fallback = setTimeout(() => {
      if (active) setRevealed(true);
    }, READY_FALLBACK_MS);
    return () => {
      active = false;
      clearTimeout(fallback);
    };
  }, [imgSig]);

  useEffect(() => {
    lightboxOpen.current = open !== null;
  }, [open]);

  useEffect(() => {
    const el = setRef.current;
    if (!el) return;
    const measure = () => {
      setWidth.current = el.offsetWidth;
      const firstWidth = (el.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0;
      if (!initialized.current && setWidth.current > 0 && firstWidth > 0 && scrollRef.current) {
        const start = setWidth.current - (scrollRef.current.clientWidth - firstWidth) / 2;
        scrollRef.current.scrollLeft = start;
        offset.current = start;
        lastScroll.current = start;
        cycleStart.current = start;
        initialized.current = true;
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const fallback = setTimeout(() => {
      firstReady.current = true;
    }, READY_FALLBACK_MS);

    const step = (ts: number) => {
      const delta = lastTs.current ? Math.min(ts - lastTs.current, 16) : 16;
      lastTs.current = ts;

      const el = scrollRef.current;
      const w = setWidth.current;
      if (el && w > 0 && initialized.current && firstReady.current && !lightboxOpen.current && !paused.current) {
        offset.current = wrap(offset.current + dir.current * delta * SCROLL_SPEED, w);
        el.scrollLeft = offset.current;
        lastScroll.current = el.scrollLeft;
        if (barRef.current) {
          const frac = ((((offset.current - cycleStart.current) % w) + w) % w) / w;
          barRef.current.style.width = `${frac * 100}%`;
        }
      }
      rafId.current = requestAnimationFrame(step);
    };

    rafId.current = requestAnimationFrame(step);
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      clearTimeout(fallback);
      lastTs.current = 0;
    };
  }, [items]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      if (dimsTimer.current) clearTimeout(dimsTimer.current);
      if (readyTimer.current) clearTimeout(readyTimer.current);
    };
  }, []);

  const markReady = () => {
    if (firstReady.current || readyTimer.current) return;
    readyTimer.current = setTimeout(() => {
      firstReady.current = true;
    }, FADE_MS + START_PAUSE_MS);
  };

  const reportDims = (key: string, w: number, h: number) => {
    if (!w || !h || pendingDims.current[key]) return;
    pendingDims.current[key] = [w, h];
    if (dimsTimer.current) clearTimeout(dimsTimer.current);
    dimsTimer.current = setTimeout(() => {
      const dims = pendingDims.current;
      pendingDims.current = {};
      fetch("/api/moments/dims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dims }),
      }).catch(() => {});
    }, 800);
  };

  const pause = () => {
    paused.current = true;
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    if (scrollRef.current) lastScroll.current = scrollRef.current.scrollLeft;
  };

  const scheduleResume = () => {
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      if (scrollRef.current) offset.current = scrollRef.current.scrollLeft;
      lastTs.current = 0;
      paused.current = false;
    }, RESUME_DELAY_MS);
  };

  const onScroll = () => {
    if (!paused.current) return;
    const el = scrollRef.current;
    const w = setWidth.current;
    if (!el || w <= 0) return;
    const moved = el.scrollLeft - lastScroll.current;
    if (Math.abs(moved) > 0.3 && Math.abs(moved) < w) {
      dir.current = moved > 0 ? 1 : -1;
    }
    const wrapped = wrap(el.scrollLeft, w);
    if (wrapped !== el.scrollLeft) el.scrollLeft = wrapped;
    lastScroll.current = el.scrollLeft;
    offset.current = el.scrollLeft;
    if (barRef.current) {
      const frac = ((((offset.current - cycleStart.current) % w) + w) % w) / w;
      barRef.current.style.width = `${frac * 100}%`;
    }
    scheduleResume();
  };

  if (ogMode) {
    return (
      <section aria-label="Moment" className="relative mx-[calc(50%-50vw)] w-screen shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/api/og/moments" alt="" className="h-[40svh] w-screen object-cover" />
      </section>
    );
  }

  if (loading) {
    return (
      <div
        className="flex h-[40svh] items-center justify-center gap-3 text-sm text-neutral-400"
        aria-live="polite"
      >
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-600 border-t-neutral-300" />
        loading images...
      </div>
    );
  }
  if (items.length === 0) return null;

  return (
    <section aria-label="Moments from the night" className="relative mx-[calc(50%-50vw)] w-screen shrink-0">
      <style>{`@keyframes momentRise{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}@keyframes momentFade{from{opacity:0}to{opacity:1}}@keyframes momentThumbIn{from{opacity:0}to{opacity:1}}.moments-strip::-webkit-scrollbar{display:none}`}</style>

      <div
        ref={scrollRef}
        className="moments-strip flex h-[40svh] overflow-x-auto overflow-y-hidden overscroll-x-contain"
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
          <div key={copy} ref={copy === 0 ? setRef : undefined} className="flex h-full flex-none">
            {items.map((it, i) => (
              <Tile
                key={`${copy}-${it.key}`}
                item={it}
                index={i}
                revealed={revealed}
                decorative={copy !== 0}
                priority={copy === 0 && i === 0}
                onMeasure={copy === 0 ? reportDims : undefined}
                onReady={copy === 0 && i === 0 ? markReady : undefined}
                onOpen={setOpen}
              />
            ))}
          </div>
        ))}
      </div>
      <div ref={barRef} className="h-[3px] bg-[#d4a553]" style={{ width: "0%" }} />

      {open && <Lightbox item={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

export default memo(MomentsGallery);

function Tile({
  item,
  index,
  revealed,
  decorative,
  priority,
  onMeasure,
  onReady,
  onOpen,
}: {
  item: FeaturedItem;
  index: number;
  revealed: boolean;
  decorative?: boolean;
  priority?: boolean;
  onMeasure?: (key: string, w: number, h: number) => void;
  onReady?: () => void;
  onOpen: (item: FeaturedItem) => void;
}) {
  const isVideo = VIDEO_EXT.test(item.key);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const startedAt = useRef(0);
  const hasDims = !!(item.w && item.h);
  const mediaClass = `transition-transform ease-out group-hover:scale-[1.04] ${
    hasDims ? "h-full w-full object-cover" : "h-full w-auto"
  }`;
  const fadeStyle = revealed
    ? {
        animation: `momentThumbIn ${FADE_MS}ms ease-out both`,
        animationDelay: `${index * STAGGER_MS}ms`,
      }
    : { opacity: 0 };

  const reveal = (w?: number, h?: number) => {
    onReady?.();
    if (!hasDims && w && h) onMeasure?.(item.key, w, h);
  };

  useEffect(() => {
    startedAt.current = performance.now();
    if (isVideo) return;
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) reveal(el.naturalWidth, el.naturalHeight);
  }, []);

  const trackLoad = () => {
    if (decorative) return;
    const ms = performance.now() - startedAt.current;
    if (ms > SLOW_LOAD_MS) posthog.capture("moment_media_slow", { key: item.key, ms: Math.round(ms) });
  };
  const trackError = () => {
    if (!decorative) posthog.capture("moment_media_error", { key: item.key });
  };

  function playHover() {
    videoRef.current?.play().catch(() => {});
  }
  function pauseHover() {
    videoRef.current?.pause();
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      onMouseEnter={playHover}
      onMouseLeave={pauseHover}
      aria-label={isVideo ? "Play moment" : "View moment"}
      aria-hidden={decorative || undefined}
      tabIndex={decorative ? -1 : undefined}
      className="group relative h-full flex-none overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#d4a553]"
      style={{ aspectRatio: hasDims ? `${item.w} / ${item.h}` : undefined }}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          src={item.url}
          muted
          loop
          playsInline
          preload="metadata"
          className={mediaClass}
          style={fadeStyle}
          onLoadedMetadata={(e) => {
            trackLoad();
            reveal(e.currentTarget.videoWidth, e.currentTarget.videoHeight);
          }}
          onError={trackError}
        />
      ) : (
        <img
          ref={imgRef}
          src={item.thumb ?? item.url}
          alt=""
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className={mediaClass}
          style={fadeStyle}
          onLoad={(e) => {
            trackLoad();
            reveal(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
          }}
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

function Lightbox({ item, onClose }: { item: FeaturedItem; onClose: () => void }) {
  const isVideo = VIDEO_EXT.test(item.key);
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const startT = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const onTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    startY.current = e.touches[0].clientY;
    startT.current = Date.now();
    setDragging(true);
  };
  const onTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (startY.current === null) return;
    setDragY(e.touches[0].clientY - startY.current);
  };
  const onTouchEnd = () => {
    if (startY.current === null) return;
    const dy = dragY;
    const velocity = Math.abs(dy) / Math.max(Date.now() - startT.current, 1);
    startY.current = null;
    setDragging(false);
    if (Math.abs(dy) > 110 || velocity > 0.6) onClose();
    else setDragY(0);
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
        className="flex items-center justify-center"
        style={{
          transform: `translateY(${dragY}px)`,
          transition: dragging ? "none" : "transform 0.25s ease",
        }}
      >
        {isVideo ? (
          <video
            src={item.url}
            controls
            autoPlay
            playsInline
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-lg shadow-2xl"
            style={{ animation: "momentRise .25s ease both" }}
          />
        ) : (
          <img
            src={item.url}
            alt=""
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[92vw] rounded-lg object-contain shadow-2xl"
            style={{ animation: "momentRise .25s ease both" }}
          />
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
    </div>
  );
}
