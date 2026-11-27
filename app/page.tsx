"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LiveBanner from "./components/LiveBanner";
import { useOgMode } from "./lib/useOgMode";
import { getVideoMetadata } from "./lib/videos.config";

const reel = getVideoMetadata("concert-where-i-wanna-be")!;
const HERO_CLIPS = [
  { src: reel.src, poster: reel.thumbnail },
  { src: "https://assets.peytspencer.com/videos/windstock.mp4", poster: undefined },
];

export default function Page() {
  const router = useRouter();
  const [hovered, setHovered] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [supportAnimating, setSupportAnimating] = useState(false);
  const isOg = useOgMode();
  const videos = useRef<(HTMLVideoElement | null)[]>([null, null]);
  const wraps = useRef<(HTMLDivElement | null)[]>([null, null]);
  const activeRef = useRef(0);
  const clipRef = useRef(0);
  const standbyClip = useRef<number | null>(null);
  const sliding = useRef(false);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const [activeClip, setActiveClip] = useState(0);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    const tick = () => {
      const video = videos.current[activeRef.current];
      const progress =
        video && video.duration > 0 ? Math.min(video.currentTime / video.duration, 1) : 0;
      bars.current.forEach((bar, i) => {
        if (!bar) return;
        const scale = i === clipRef.current ? (reduced.matches ? 1 : progress) : 0;
        bar.style.transform = `scaleX(${scale})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const activeVideo = () => videos.current[activeRef.current];

  const setMuted = (muted: boolean) => {
    videos.current.forEach((v) => {
      if (v) v.muted = muted;
    });
    setIsMuted(muted);
  };

  const loadClip = (video: HTMLVideoElement, clipIndex: number) => {
    const clip = HERO_CLIPS[clipIndex];
    video.preload = "auto";
    video.poster = clip.poster ?? "";
    video.src = clip.src;
    video.load();
    video.pause();
  };

  const prepareStandby = () => {
    const standby = videos.current[1 - activeRef.current];
    if (!standby || standbyClip.current !== null) return;
    standbyClip.current = (clipRef.current + 1) % HERO_CLIPS.length;
    loadClip(standby, standbyClip.current);
  };

  const placeOffscreen = (wrap: HTMLDivElement, side = 1) => {
    wrap.style.transition = "none";
    wrap.style.transform = `translateX(${side * 100}%)`;
    wrap.style.zIndex = "0";
  };

  const goTo = (target: number, dir: 1 | -1) => {
    if (sliding.current || target === clipRef.current) return;
    const outIndex = activeRef.current;
    const inIndex = 1 - outIndex;
    const out = videos.current[outIndex];
    const incoming = videos.current[inIndex];
    const outWrap = wraps.current[outIndex];
    const inWrap = wraps.current[inIndex];
    if (!out || !incoming || !outWrap || !inWrap) return;
    sliding.current = true;

    if (standbyClip.current !== target) {
      standbyClip.current = target;
      loadClip(incoming, target);
    }
    placeOffscreen(inWrap, dir);

    const finish = () => {
      placeOffscreen(outWrap);
      standbyClip.current = (target + 1) % HERO_CLIPS.length;
      loadClip(out, standbyClip.current);
      sliding.current = false;
    };

    const start = () => {
      activeRef.current = inIndex;
      clipRef.current = target;
      setActiveClip(target);
      if (incoming.currentTime > 0) incoming.currentTime = 0;
      incoming.muted = out.muted;
      incoming.play().catch(() => {});
      outWrap.style.zIndex = "1";
      inWrap.style.zIndex = "2";
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        inWrap.style.transition = "none";
        inWrap.style.transform = "translateX(0)";
        finish();
        return;
      }
      void inWrap.offsetWidth;
      inWrap.style.transition = "transform 600ms cubic-bezier(0.22, 1, 0.36, 1)";
      inWrap.style.transform = "translateX(0)";
      let done = false;
      const end = () => {
        if (done) return;
        done = true;
        inWrap.removeEventListener("transitionend", end);
        finish();
      };
      inWrap.addEventListener("transitionend", end);
      window.setTimeout(end, 750);
    };

    if (incoming.readyState >= 3) {
      start();
    } else {
      let started = false;
      const once = () => {
        if (started) return;
        started = true;
        incoming.removeEventListener("canplay", once);
        incoming.removeEventListener("playing", once);
        start();
      };
      incoming.addEventListener("canplay", once);
      incoming.addEventListener("playing", once);
      incoming.muted = true;
      incoming.play().catch(() => {});
    }
  };

  const playNextClip = () => goTo((clipRef.current + 1) % HERO_CLIPS.length, 1);

  const onPanelPointerDown = (e: React.PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY };
    swiped.current = false;
  };

  const onPanelPointerUp = (e: React.PointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
    swiped.current = true;
    const n = HERO_CLIPS.length;
    if (dx < 0) goTo((clipRef.current + 1) % n, 1);
    else goTo((clipRef.current - 1 + n) % n, -1);
  };

  const onPanelClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    toggleMute();
  };

  const handleSupportClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(hover: hover)").matches) return;
    if (supportAnimating) return;
    e.preventDefault();
    setSupportAnimating(true);
    window.setTimeout(() => router.push("/support"), 1000);
  };

  const imgClass = (i: number, alwaysColor = false) => {
    const base = "object-cover transform transition-all duration-100 ease-out";
    if (alwaysColor) {
      const isColored = hovered === null || hovered === i;
      const colorClass = isColored ? "grayscale-0" : "grayscale";
      const scaleClass = hovered === i ? "scale-105" : "";
      return `${base} ${colorClass} ${scaleClass}`.trim();
    }
    if (hovered === null) return `${base} grayscale`;
    return hovered === i ? `${base} grayscale-0 scale-105` : `${base} grayscale`;
  };

  const overlayClass = (i: number, alwaysColor = false) => {
    const base = "absolute inset-0 z-10 pointer-events-none transition-opacity duration-100";
    if (alwaysColor) {
      return hovered === null || hovered === i
        ? `${base} opacity-0`
        : `${base} opacity-100 bg-black/50`;
    }
    if (hovered === i) return `${base} opacity-0`;
    return `${base} opacity-100 bg-black/50`;
  };

  const imgHandlers = (i: number) => ({
    onMouseEnter: () => {
      setHovered(i);
      if (i !== 3 && activeVideo() && !isMuted) setMuted(true);
    },
    onMouseLeave: () => setHovered(null),
    onTouchStart: () => {
      setHovered(i);
      if (i !== 3 && activeVideo() && !isMuted) setMuted(true);
    },
    onTouchEnd: () => setHovered(null),
  });

  const toggleMute = () => {
    const video = activeVideo();
    if (video) setMuted(!video.muted);
  };

  return (
    <div className={`h-screen w-full bg-neutral-900 ${isOg ? "og-mode" : ""}`}>
      <LiveBanner />
      <div className="h-full">
        <section className="relative h-full">
          <div className="absolute inset-0 z-0">
            <div className="home-grid h-full grid grid-cols-2 grid-rows-4 sm:grid-rows-6 sm:grid-cols-3 gap-0">
              <div
                className="relative row-span-3 sm:row-span-6 overflow-hidden order-2 sm:order-none"
                {...imgHandlers(1)}
              >
                <Image
                  alt="newera"
                  src="/images/home/new-era-1.jpg"
                  fill
                  className={imgClass(1)}
                  priority
                />
                <div className={`${overlayClass(1)} panel-overlay`} />
              </div>
              <div
                className="relative row-span-1 sm:row-span-3 overflow-hidden order-1 sm:order-none"
                {...imgHandlers(2)}
              >
                <Image
                  alt="bio"
                  src="/images/home/bio.jpeg"
                  fill
                  className={imgClass(2, true)}
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                <div className={`${overlayClass(2, true)} panel-overlay`} />
              </div>
              <div
                className="relative row-span-3 sm:row-span-6 overflow-hidden order-3 sm:order-none"
                {...imgHandlers(3)}
                style={{ touchAction: "pan-y" }}
                onPointerDown={onPanelPointerDown}
                onPointerUp={onPanelPointerUp}
                onPointerCancel={() => {
                  swipe.current = null;
                }}
                onClick={onPanelClick}
              >
                {[0, 1].map((n) => (
                  <div
                    key={n}
                    ref={(el) => {
                      wraps.current[n] = el;
                    }}
                    className="absolute inset-0"
                    style={n === 0 ? undefined : { transform: "translateX(100%)" }}
                  >
                    <video
                      ref={(el) => {
                        videos.current[n] = el;
                      }}
                      className={`${imgClass(3)} absolute inset-0 w-full h-full object-cover`}
                      src={n === 0 ? HERO_CLIPS[0].src : undefined}
                      poster={n === 0 ? HERO_CLIPS[0].poster : undefined}
                      preload={n === 0 ? undefined : "none"}
                      onPlaying={n === 0 ? prepareStandby : undefined}
                      onEnded={() => {
                        if (activeRef.current === n) playNextClip();
                      }}
                      muted
                      autoPlay={n === 0}
                      playsInline
                    />
                  </div>
                ))}
                <div className={`${overlayClass(3)} panel-overlay`} />
                <div className="absolute top-[3px] left-4 z-20 flex items-center gap-1">
                  {HERO_CLIPS.map((clip, i) => (
                    <button
                      key={clip.src}
                      type="button"
                      aria-label={`Play clip ${i + 1} of ${HERO_CLIPS.length}`}
                      aria-current={i === activeClip ? "true" : undefined}
                      className="flex h-6 items-center px-0.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        goTo(i, i > clipRef.current ? 1 : -1);
                      }}
                    >
                      <span
                        className="relative block h-1.5 w-7 overflow-hidden rounded-full"
                        style={{
                          background: "rgba(255,255,255,.35)",
                          boxShadow: "0 1px 2px rgba(0,0,0,.5)",
                        }}
                      >
                        <span
                          ref={(el) => {
                            bars.current[i] = el;
                          }}
                          className="absolute inset-0 origin-left"
                          style={{ background: "rgba(255,255,255,.95)", transform: "scaleX(0)" }}
                        />
                      </span>
                    </button>
                  ))}
                </div>
                <button
                  className="absolute top-4 right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors text-white pointer-events-auto"
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                >
                  {isMuted ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                      />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <div
                className="relative row-span-3 sm:row-span-6 overflow-hidden order-4 sm:order-none"
                {...imgHandlers(4)}
              >
                <Image
                  alt="openmic"
                  src="/images/home/openmic.jpg"
                  fill
                  className={imgClass(4)}
                  priority
                />
                <div className={`${overlayClass(4)} panel-overlay`} />
              </div>
            </div>
          </div>

          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
            <div className="bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(0,0,0,0.6)_0%,transparent_70%)] absolute inset-0" />
            <div className="relative px-4 pointer-events-auto inline-flex flex-col items-stretch">
              <h1 className="font-bebas text-6xl md:text-8xl leading-none tracking-tight mb-2 text-center">
                <span className="text-white">PEYT</span>{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                  SPENCER
                </span>
              </h1>

              <Link
                href="/support"
                onClick={handleSupportClick}
                className="group flex items-stretch text-white font-medium text-sm md:text-lg whitespace-nowrap h-10 md:h-12"
              >
                <span className="w-10 md:w-12 h-full shrink-0 overflow-hidden rounded-l-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://upload.wikimedia.org/wikipedia/commons/c/cf/Flag_of_Canada.svg"
                    alt=""
                    aria-hidden
                    className={`support-cta-flag w-full h-full object-cover object-right transition-[filter,opacity] ${
                      supportAnimating
                        ? "duration-1000 grayscale-0 opacity-100"
                        : "duration-200 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100"
                    }`}
                  />
                </span>
                <span className="support-cta-bg flex-1 flex items-center justify-center px-4 bg-white/10 backdrop-blur-sm transition-colors group-hover:bg-white/20">
                  Support my tour across North America
                </span>
                <span className="w-10 md:w-12 h-full shrink-0 overflow-hidden rounded-r-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://upload.wikimedia.org/wikipedia/en/a/a4/Flag_of_the_United_States.svg"
                    alt=""
                    aria-hidden
                    className={`support-cta-flag w-full h-full object-cover object-left transition-[filter,opacity] ${
                      supportAnimating
                        ? "duration-1000 grayscale-0 opacity-100"
                        : "duration-200 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100"
                    }`}
                  />
                </span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
