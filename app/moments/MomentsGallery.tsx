"use client";

import { memo, useEffect, useRef, useState } from "react";

interface FeaturedItem {
  key: string;
  url: string;
  w?: number;
  h?: number;
}

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;
const SCROLL_SPEED = 0.06; // px per ms (~1px per frame at 60fps)
const RESUME_DELAY_MS = 5000;
const FADE_MS = 700;
const START_PAUSE_MS = 1000;
const READY_FALLBACK_MS = 4000;

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
    let active = true;
    fetch("/api/moments/featured")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (active) setItems(Array.isArray(data.items) ? data.items : []);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

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
      const delta = lastTs.current ? ts - lastTs.current : 16;
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

  if (items.length === 0) return null;

  return (
    <section aria-label="Moments from the night" className="relative mx-[calc(50%-50vw)] w-screen shrink-0">
      <style>{`@keyframes momentRise{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}@keyframes momentFade{from{opacity:0}to{opacity:1}}.moments-strip::-webkit-scrollbar{display:none}`}</style>

      <div
        ref={scrollRef}
        className="moments-strip flex h-[40dvh] overflow-x-auto overflow-y-hidden overscroll-x-contain"
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
                decorative={copy !== 0}
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
  decorative,
  onMeasure,
  onReady,
  onOpen,
}: {
  item: FeaturedItem;
  decorative?: boolean;
  onMeasure?: (key: string, w: number, h: number) => void;
  onReady?: () => void;
  onOpen: (item: FeaturedItem) => void;
}) {
  const isVideo = VIDEO_EXT.test(item.key);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasDims = !!(item.w && item.h);
  const [loaded, setLoaded] = useState(false);
  const mediaClass = `transition ease-out group-hover:scale-[1.04] ${
    hasDims ? "h-full w-full object-cover" : "h-full w-auto"
  } ${loaded ? "opacity-100" : "opacity-0"}`;
  const fadeStyle = { transitionDuration: `${FADE_MS}ms` };

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
            setLoaded(true);
            onReady?.();
            if (!hasDims)
              onMeasure?.(item.key, e.currentTarget.videoWidth, e.currentTarget.videoHeight);
          }}
        />
      ) : (
        <img
          src={item.url}
          alt=""
          loading="eager"
          decoding="async"
          className={mediaClass}
          style={fadeStyle}
          onLoad={(e) => {
            setLoaded(true);
            onReady?.();
            if (!hasDims)
              onMeasure?.(item.key, e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
          }}
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

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      style={{ animation: "momentFade .2s ease both" }}
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
