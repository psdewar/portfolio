"use client";

import { memo, useEffect, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import { preconnect } from "react-dom";
import posthog from "posthog-js";

interface FeaturedItem {
  key: string;
  thumb?: string;
  srcSet?: string;
  city?: string;
  w?: number;
  h?: number;
}

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
const SCROLL_SPEED = 0.06; // px per ms (~1px per frame at 60fps)
const RESUME_DELAY_MS = 5000;
const FADE_MS = 700;
const STAGGER_MS = 70;
const START_PAUSE_MS = 1000;
const READY_FALLBACK_MS = 4000;
const SLOW_LOAD_MS = 2500;
const PRELOAD_MARGIN_TILES = 4;

function wrap(x: number, half: number) {
  if (half <= 0) return x;
  let v = x;
  while (v >= half * 2) v -= half;
  while (v < half) v += half;
  return v;
}

function tileSizes(item: { w?: number; h?: number }): string {
  return item.w && item.h ? `${Math.round((item.w / item.h) * 40)}svh` : "40svh";
}

function fadeIn(revealed: boolean, index: number): React.CSSProperties {
  return revealed
    ? {
        animation: `momentThumbIn ${FADE_MS}ms ease-out both`,
        animationDelay: `${index * STAGGER_MS}ms`,
      }
    : { opacity: 0 };
}

function MomentsGallery({ og = false, leg }: { og?: boolean; leg?: string }) {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [open, setOpen] = useState<FeaturedItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [warmed, setWarmed] = useState<Set<string>>(() => new Set());

  const scrollRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const setWidth = useRef(0);
  const offset = useRef(0);
  const lastScroll = useRef(0);
  const paused = useRef(false);
  const rafId = useRef<number | null>(null);
  const lastTs = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialized = useRef(false);
  const dir = useRef(1);
  const barRef = useRef<HTMLDivElement>(null);
  const cycleStart = useRef(0);
  const firstReady = useRef(false);
  const readyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lightboxOpen = useRef(false);
  const pendingDims = useRef<Record<string, [number, number]>>({});
  const dimsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entries: Array<
    { slate: string; index: number } | { item: FeaturedItem; index: number }
  > = [];
  {
    let lastCity = "";
    items.forEach((it, i) => {
      if (it.city && it.city !== lastCity) {
        entries.push({ slate: it.city, index: i });
        lastCity = it.city;
      }
      entries.push({ item: it, index: i });
    });
  }

  useEffect(() => {
    // OG capture: skip the slider (the single moment is rendered server-side
    // below) so we don't fetch or wait on the whole gallery.
    if (og) {
      setLoading(false);
      return;
    }
    let active = true;
    fetch(leg ? `/api/moments/featured?leg=${encodeURIComponent(leg)}` : "/api/moments/featured")
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data) => {
        if (!active) return;
        const next: FeaturedItem[] = Array.isArray(data.items) ? data.items : [];
        const first = next[0]?.thumb;
        if (first) {
          try {
            preconnect(new URL(first).origin);
          } catch {}
        }
        firstReady.current = false;
        if (readyTimer.current) {
          clearTimeout(readyTimer.current);
          readyTimer.current = null;
        }
        setRevealed(false);
        setWarmed(new Set());
        setItems(next);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [og, leg]);

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
    const root = scrollRef.current;
    if (!root || items.length === 0) return;
    const totalWidth = setRef.current?.offsetWidth || 0;
    const avgWidth = totalWidth > 0 ? totalWidth / Math.max(entries.length, 1) : root.clientWidth;
    const margin = Math.round(avgWidth * PRELOAD_MARGIN_TILES);

    const observer = new IntersectionObserver(
      (observedEntries) => {
        const keys: string[] = [];
        for (const e of observedEntries) {
          if (!e.isIntersecting) continue;
          const key = (e.target as HTMLElement).dataset.photoKey;
          if (key) keys.push(key);
          observer.unobserve(e.target);
        }
        if (keys.length === 0) return;
        setWarmed((prev) => {
          const next = new Set(prev);
          for (const k of keys) next.add(k);
          return next;
        });
      },
      { root, rootMargin: `0px ${margin}px 0px ${margin}px` },
    );

    root.querySelectorAll<HTMLElement>("[data-photo-key]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  useEffect(() => {
    if (items.length === 0) return;

    const fallback = setTimeout(() => {
      firstReady.current = true;
      setRevealed(true);
    }, READY_FALLBACK_MS);

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      return () => clearTimeout(fallback);
    }

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
      if (settleTimer.current) clearTimeout(settleTimer.current);
      if (dimsTimer.current) clearTimeout(dimsTimer.current);
      if (readyTimer.current) clearTimeout(readyTimer.current);
    };
  }, []);

  const markReady = () => {
    if (firstReady.current || readyTimer.current) return;
    readyTimer.current = setTimeout(() => {
      firstReady.current = true;
      setRevealed(true);
    }, FADE_MS + START_PAUSE_MS);
  };

  const reportDims = (key: string, w: number, h: number) => {
    if (!w || !h || pendingDims.current[key]) return;
    const it = items.find((x) => x.key === key);
    if (!it) return;
    if (it.w && it.h) {
      // Served dims can be wrong for EXIF-rotated shots; trust what the
      // browser actually decoded and fix the box in place.
      if (Math.abs(it.w / it.h - w / h) > (w / h) * 0.02) {
        setItems((prev) => prev.map((x) => (x.key === key ? { ...x, w, h } : x)));
      }
      return;
    }
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

  const applyWrap = () => {
    const el = scrollRef.current;
    const w = setWidth.current;
    if (!el || w <= 0) return;
    const wrapped = wrap(el.scrollLeft, w);
    if (wrapped !== el.scrollLeft) el.scrollLeft = wrapped;
    lastScroll.current = el.scrollLeft;
    offset.current = el.scrollLeft;
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
    const nearEdge =
      el.scrollLeft < w * 0.2 || el.scrollLeft > w * 3 - el.clientWidth - w * 0.2;
    if (nearEdge) {
      applyWrap();
    } else {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(applyWrap, 150);
    }
    lastScroll.current = el.scrollLeft;
    offset.current = el.scrollLeft;
    if (barRef.current) {
      const frac = ((((offset.current - cycleStart.current) % w) + w) % w) / w;
      barRef.current.style.width = `${frac * 100}%`;
    }
    scheduleResume();
  };

  if (og) {
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
            {entries.map((e, j) =>
              "slate" in e ? (
                <Slate
                  key={`${copy}-slate-${j}`}
                  city={e.slate}
                  index={e.index}
                  revealed={revealed}
                  decorative={copy !== 0}
                />
              ) : (
                <Tile
                  key={`${copy}-${e.item.key}`}
                  item={e.item}
                  index={e.index}
                  revealed={revealed}
                  decorative={copy !== 0}
                  priority={copy === 0 && e.index === 0}
                  warmed={warmed.has(e.item.key)}
                  onMeasure={copy === 0 ? reportDims : undefined}
                  onReady={copy === 0 && e.index === 0 ? markReady : undefined}
                  onOpen={setOpen}
                />
              ),
            )}
          </div>
        ))}
      </div>
      <div ref={barRef} className="h-[3px] bg-[#d4a553]" style={{ width: "0%" }} />

      {open && <Lightbox item={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

export default memo(MomentsGallery);

function Slate({
  city,
  index,
  revealed,
  decorative,
}: {
  city: string;
  index: number;
  revealed: boolean;
  decorative?: boolean;
}) {
  const comma = city.lastIndexOf(", ");
  const name = comma > 0 ? city.slice(0, comma) : city;
  const region = comma > 0 ? city.slice(comma + 2) : "";
  return (
    <div
      aria-hidden={decorative || undefined}
      className="relative flex h-full w-24 flex-none flex-col items-center justify-center overflow-hidden bg-[#262b3f] text-center sm:w-28"
      style={fadeIn(revealed, index)}
    >
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-1/2 top-16 border-l-2 border-dashed border-white/70"
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 56 40"
        className="absolute left-1/2 top-6 h-10 w-14"
        fill="none"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 7"
      >
        <path d="M1 40 Q1 2 30 2 H55" />
      </svg>
      <div className="relative flex max-w-full flex-col items-center gap-2.5 bg-[#262b3f] px-2 py-3">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-[#d4a553]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
        <span className="max-w-full font-bebas text-lg leading-[0.95] text-white sm:text-2xl">
          {name}
        </span>
        {region && (
          <span
            className="text-xs uppercase tracking-[0.25em] text-[#d4a553]"
            style={{ fontFamily: '"Space Mono", monospace' }}
          >
            {region}
          </span>
        )}
      </div>
    </div>
  );
}

function Tile({
  item,
  index,
  revealed,
  decorative,
  priority,
  warmed,
  onMeasure,
  onReady,
  onOpen,
}: {
  item: FeaturedItem;
  index: number;
  revealed: boolean;
  decorative?: boolean;
  priority?: boolean;
  warmed: boolean;
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
  const sizes = tileSizes(item);
  const fadeStyle = fadeIn(revealed, index);

  const reveal = (w?: number, h?: number) => {
    onReady?.();
    if (w && h) onMeasure?.(item.key, w, h);
  };

  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!warmed) return;
    startedAt.current = performance.now();
    if (isVideo) {
      reveal();
      return;
    }
    if (item.thumb) {
      setSrc(item.thumb);
      return;
    }
    let on = true;
    fetchView(item.key).then((u) => {
      if (on && u) setSrc(u);
    });
    return () => {
      on = false;
    };
  }, [warmed]);

  const trackLoad = () => {
    if (decorative) return;
    const ms = performance.now() - startedAt.current;
    if (ms > SLOW_LOAD_MS) posthog.capture("moment_media_slow", { key: item.key, ms: Math.round(ms) });
  };
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
    startedAt.current = performance.now();
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
      data-photo-key={item.key}
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
          poster={warmed ? item.thumb : undefined}
          muted
          loop
          playsInline
          preload="none"
          className={mediaClass}
          style={fadeStyle}
          onLoadedMetadata={(e) => {
            trackLoad();
            reveal(e.currentTarget.videoWidth, e.currentTarget.videoHeight);
          }}
          onError={() => {
            trackError();
            reveal();
          }}
        />
      ) : (
        <img
          ref={imgRef}
          src={warmed ? (src ?? undefined) : undefined}
          srcSet={warmed ? item.srcSet : undefined}
          sizes={warmed && item.srcSet ? sizes : undefined}
          alt=""
          loading="eager"
          decoding="async"
          fetchPriority={priority ? "high" : undefined}
          className={mediaClass}
          style={fadeStyle}
          onLoad={(e) => {
            trackLoad();
            reveal(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight);
          }}
          onError={() => {
            trackError();
            reveal();
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
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startY = useRef<number | null>(null);
  const startT = useRef(0);
  const [full, setFull] = useState<string | null>(null);

  useEffect(() => {
    let on = true;
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
        {isVideo && full ? (
          <video
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
            src={(isVideo ? item.thumb : full ?? item.thumb) ?? undefined}
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
