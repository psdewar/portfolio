"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlayIcon, SpeakerSlashIcon, XIcon } from "@phosphor-icons/react";
import posthog from "posthog-js";
import { RSVP_INTRO } from "../lib/videos.config";
import { captureUtm } from "../lib/utm";
import { useScrollLock } from "../hooks/useScrollLock";
import { useEscape } from "../hooks/useEscape";

const MILESTONES = [25, 50, 75] as const;

// Fire-and-forget: tracking must never interrupt playback.
export function track(event: string, props: Record<string, unknown> = {}) {
  try {
    posthog.capture(event, {
      video: RSVP_INTRO.id,
      ...captureUtm(),
      ts: new Date().toISOString(),
      ...props,
    });
  } catch {}
}

// The <video> with tracking and muted-autoplay handling, shared by the modal and the inline player.
function IntroVideoEl({
  onEnd,
  className,
  withSound = false,
  fill = false,
}: {
  onEnd: () => void;
  className: string;
  withSound?: boolean;
  fill?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fired = useRef(new Set<number>());
  const [hintShown, setHintShown] = useState(!withSound); // pill hides for good after the first unmute
  const [blocked, setBlocked] = useState(false); // autoplay refused (Low Power Mode, in-app browsers)

  // Each milestone (0 = play) fires once per open.
  const fireOnce = (key: number, event: string, props: Record<string, unknown>) => {
    if (fired.current.has(key)) return;
    fired.current.add(key);
    track(event, props);
  };

  useEffect(() => {
    const el = videoRef.current;
    if (el) {
      // Arriving by link has no user gesture, so autoplay has to start muted.
      // A replay follows a click, so it may start with sound.
      const playMuted = () => {
        el.muted = true;
        setHintShown(true);
        el.play().catch(() => setBlocked(true));
      };
      if (withSound) {
        el.muted = false;
        // AbortError = interrupted by a pause/reload (StrictMode remount), not a policy refusal.
        el.play().catch((e) => {
          if (e?.name !== "AbortError") playMuted();
        });
      } else {
        playMuted();
      }
    }
    // Some browsers resolve play() yet stay paused; treat that as blocked too.
    const check = window.setTimeout(() => {
      if (el?.paused && !el.ended) setBlocked(true);
    }, 1200);
    return () => {
      window.clearTimeout(check);
      el?.pause();
    };
  }, []);

  return (
    <div className={`relative flex h-full max-w-full items-center justify-center cursor-pointer ${fill ? "w-full" : ""}`} onClick={(e) => e.stopPropagation()}>
      <video
        ref={videoRef}
        src={RSVP_INTRO.src}
        poster={RSVP_INTRO.poster}
        playsInline
        preload="metadata"
        muted
        style={{ aspectRatio: RSVP_INTRO.aspect }}
        className={className}
        onPlay={() => {
          setBlocked(false);
          fireOnce(0, "rsvp_intro_play", {});
        }}
        onTimeUpdate={() => {
          const el = videoRef.current;
          if (!el?.duration) return;
          const pct = (el.currentTime / el.duration) * 100;
          for (const m of MILESTONES) if (pct >= m) fireOnce(m, "rsvp_intro_progress", { percent: m });
        }}
        onClick={(e) => {
          // Tap anywhere on the frame toggles mute, like Instagram.
          const el = e.currentTarget;
          if (blocked || el.paused) {
            // A tap is a user gesture, so playback may start with sound.
            el.muted = false;
            setHintShown(false);
            el.play().catch(() => {});
            return;
          }
          el.muted = !el.muted;
          if (!el.muted) setHintShown(false);
        }}
        onEnded={() => {
          fireOnce(100, "rsvp_intro_progress", { percent: 100 });
          onEnd();
        }}
      >
        {RSVP_INTRO.captions && (
          <track kind="captions" src={RSVP_INTRO.captions} srcLang="en" label="English" default />
        )}
      </video>
      {hintShown && !blocked && (
        <span className="pointer-events-none absolute left-1/2 top-3 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30">
          <SpeakerSlashIcon size={18} weight="fill" />
          Tap to unmute
        </span>
      )}
      {blocked && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
            <PlayIcon size={40} weight="fill" />
          </span>
        </span>
      )}
    </div>
  );
}

// Phones: fullscreen overlay. Portaled to body because the list sits inside a stacking context
// that the site header paints over.
export function IntroModal({
  onClose,
  withSound,
}: {
  onClose: () => void;
  withSound?: boolean;
}) {
  useScrollLock();
  useEscape(onClose);

  useEffect(() => {
    const onHidden = () => {
      if (document.hidden) document.querySelector("video")?.pause();
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, []);

  const sheetRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ id: -1, startY: 0, lastY: 0, lastT: 0, v: 0, active: false });
  const suppressClick = useRef(false);

  const setDrag = (dy: number) => {
    const vh = window.innerHeight;
    if (sheetRef.current) sheetRef.current.style.transform = `translateY(${dy}px)`;
    if (backdropRef.current)
      backdropRef.current.style.opacity = String(1 - Math.min(Math.max(dy, 0) / vh, 1) * 0.9);
  };
  const animateTo = (dy: number, opacity: number, done?: () => void) => {
    const sheet = sheetRef.current;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!sheet || reduce) {
      setDrag(dy);
      done?.();
      return;
    }
    sheet.style.transition = "transform 220ms ease-out";
    if (backdropRef.current) {
      backdropRef.current.style.transition = "opacity 220ms ease-out";
      backdropRef.current.style.opacity = String(opacity);
    }
    sheet.style.transform = `translateY(${dy}px)`;
    window.setTimeout(() => {
      sheet.style.transition = "";
      if (backdropRef.current) backdropRef.current.style.transition = "";
      done?.();
    }, 230);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || drag.current.id !== -1) return;
    drag.current = { id: e.pointerId, startY: e.clientY, lastY: e.clientY, lastT: e.timeStamp, v: 0, active: false };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (e.pointerId !== d.id) return;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (Math.abs(dy) < 10) return;
      d.active = true;
      suppressClick.current = true;
    }
    const dt = e.timeStamp - d.lastT;
    if (dt > 0) d.v = (e.clientY - d.lastY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    setDrag(dy > 0 ? dy : dy * 0.15); // upward drags are resisted
  };
  const onPointerEnd = (e: React.PointerEvent) => {
    const d = drag.current;
    if (e.pointerId !== d.id) return;
    drag.current = { ...d, id: -1, active: false };
    if (!d.active) return;
    // Let the click that follows a drag pass, then re-arm.
    window.setTimeout(() => (suppressClick.current = false), 0);
    const dy = e.clientY - d.startY;
    const cancelled = e.type === "pointercancel";
    if (!cancelled && (dy > window.innerHeight * 0.25 || d.v > 0.5)) {
      animateTo(window.innerHeight, 0, onClose);
    } else {
      animateTo(0, 1);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Intro video">
      <div ref={backdropRef} className="absolute inset-0 bg-black" />
      <div
        ref={sheetRef}
        className="absolute inset-0 flex items-center justify-center touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onClickCapture={(e) => {
          // A drag must not also toggle mute.
          if (suppressClick.current) {
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        <IntroVideoEl
          onEnd={onClose}
          withSound={withSound}
          fill
          className="h-full w-full bg-black object-contain"
        />
      </div>
      <button
        type="button"
        aria-label="Close video"
        onClick={onClose}
        className="absolute z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white/90 hover:text-white"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 0.75rem)",
          right: "calc(env(safe-area-inset-right, 0px) + 0.75rem)",
        }}
      >
        <XIcon size={24} weight="bold" />
      </button>
    </div>,
    document.body,
  );
}

// Desktop: covers the poster in the right column; the poster stays mounted underneath.
export function IntroInline({
  onClose,
  withSound,
}: {
  onClose: () => void;
  withSound?: boolean;
}) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
      <IntroVideoEl
        onEnd={onClose}
        withSound={withSound}
        className="max-h-full max-w-full bg-black object-contain"
      />
      <button
        type="button"
        aria-label="Close video"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white/90 hover:text-white"
      >
        <XIcon size={20} weight="bold" />
      </button>
    </div>
  );
}
