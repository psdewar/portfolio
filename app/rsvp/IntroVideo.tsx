"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PlayIcon, SpeakerSlashIcon, XIcon } from "@phosphor-icons/react";
import posthog from "posthog-js";
import { RSVP_INTRO } from "../lib/videos.config";
import { captureUtm } from "../lib/utm";
import { useScrollLock } from "../hooks/useScrollLock";

const MILESTONES = [25, 50, 75] as const;

// Fire-and-forget: tracking must never interrupt playback.
function track(event: string, props: Record<string, unknown>) {
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
}: {
  onEnd: () => void;
  className: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fired = useRef(new Set<number>());
  const [hintShown, setHintShown] = useState(true); // pill hides for good after the first unmute
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
      el.muted = true;
      el.play().catch(() => setBlocked(true));
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
    <div className="relative flex h-full max-w-full items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
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
export function IntroModal({ onClose }: { onClose: () => void }) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  useScrollLock();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCloseRef.current();
    const onHidden = () => {
      if (document.hidden) document.querySelector("video")?.pause();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onHidden);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onHidden);
    };
  }, []);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Intro video"
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Close video"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white/90 hover:text-white"
      >
        <XIcon size={24} weight="bold" />
      </button>
      <div className="flex min-h-0 max-h-[calc(100dvh-5.5rem)] w-full justify-center">
        <IntroVideoEl
          onEnd={onClose}
          className="max-h-full max-w-full rounded-lg bg-black object-contain"
        />
      </div>
    </div>,
    document.body,
  );
}

// Desktop: covers the poster in the right column; the poster stays mounted underneath.
export function IntroInline({ onClose }: { onClose: () => void }) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
      <IntroVideoEl
        onEnd={onClose}
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
