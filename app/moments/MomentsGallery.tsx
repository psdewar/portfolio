"use client";

import { useEffect, useRef, useState } from "react";

interface FeaturedItem {
  key: string;
  url: string;
}

const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;

export default function MomentsGallery() {
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [open, setOpen] = useState<FeaturedItem | null>(null);

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

  if (items.length === 0) return null;

  const hero = items[0];
  const rest = items.slice(1);

  return (
    <section aria-label="Moments from the night" className="space-y-4">
      <style>{`@keyframes momentRise{from{opacity:0;transform:translateY(20px) scale(.97)}to{opacity:1;transform:none}}@keyframes momentFade{from{opacity:0}to{opacity:1}}`}</style>

      <Tile item={hero} index={0} hero onOpen={setOpen} />

      {rest.length > 0 && (
        <div className="columns-2 sm:columns-3 gap-3 [column-fill:_balance]">
          {rest.map((it, i) => (
            <Tile key={it.key} item={it} index={i + 1} onOpen={setOpen} />
          ))}
        </div>
      )}

      {open && <Lightbox item={open} onClose={() => setOpen(null)} />}
    </section>
  );
}

function Tile({
  item,
  index,
  hero,
  onOpen,
}: {
  item: FeaturedItem;
  index: number;
  hero?: boolean;
  onOpen: (item: FeaturedItem) => void;
}) {
  const isVideo = VIDEO_EXT.test(item.key);
  const videoRef = useRef<HTMLVideoElement>(null);

  function playHover() {
    if (!hero) videoRef.current?.play().catch(() => {});
  }
  function pauseHover() {
    if (!hero) videoRef.current?.pause();
  }

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      onMouseEnter={playHover}
      onMouseLeave={pauseHover}
      aria-label={isVideo ? "Play moment" : "View moment"}
      className={`group relative block w-full overflow-hidden rounded-xl ring-1 ring-black/5 dark:ring-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d4a553] ${
        hero ? "" : "mb-3 break-inside-avoid"
      }`}
      style={{
        animation: "momentRise .6s cubic-bezier(.2,.7,.2,1) both",
        animationDelay: `${Math.min(index * 70, 700)}ms`,
      }}
    >
      <div className="overflow-hidden">
        {isVideo ? (
          <video
            ref={videoRef}
            src={item.url}
            muted
            loop
            playsInline
            autoPlay={hero}
            preload="metadata"
            className={`w-full transition-transform duration-700 ease-out group-hover:scale-[1.04] ${
              hero ? "aspect-[4/3] sm:aspect-[16/9] object-cover" : "h-auto"
            }`}
          />
        ) : (
          <img
            src={item.url}
            alt=""
            loading={hero ? "eager" : "lazy"}
            decoding="async"
            className={`w-full transition-transform duration-700 ease-out group-hover:scale-[1.04] ${
              hero ? "aspect-[4/3] sm:aspect-[16/9] object-cover" : "h-auto"
            }`}
          />
        )}
      </div>

      <span className="pointer-events-none absolute inset-0 rounded-xl ring-0 ring-[#d4a553] transition-all duration-300 group-hover:ring-2" />

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
  item,
  onClose,
}: {
  item: FeaturedItem;
  onClose: () => void;
}) {
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
