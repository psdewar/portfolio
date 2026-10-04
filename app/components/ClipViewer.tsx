"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CaretDownIcon, CaretUpIcon, XIcon } from "@phosphor-icons/react";
import { useScrollLock } from "../hooks/useScrollLock";

export interface ViewerClip {
  id: string;
  src: string;
  thumbnail?: string;
  title?: string;
}

const SWIPE_PX = 50;

const controlClass =
  "grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white backdrop-blur transition hover:bg-white/25 active:scale-90 disabled:opacity-30 disabled:pointer-events-none";

export function ClipViewer({
  clips,
  startIndex,
  startTime,
  videoRef,
  onLoud,
  onClose,
}: {
  clips: ViewerClip[];
  startIndex: number;
  startTime: number;
  videoRef: RefObject<HTMLVideoElement>;
  onLoud: (on: boolean) => void;
  onClose: () => void;
}) {
  useScrollLock();
  const [index, setIndex] = useState(startIndex);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchY = useRef<number | null>(null);
  const seekRef = useRef(startTime);
  const clip = clips[index];

  useEffect(() => {
    closeRef.current?.focus();
    onLoud(true);
  }, [onLoud]);

  const go = (dir: 1 | -1) => {
    const next = index + dir;
    if (next < 0 || next >= clips.length) return;
    seekRef.current = 0;
    setIndex(next);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "Tab") {
      const items = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)");
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const togglePause = () => {
    const el = videoRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={clip.title ?? "Clip viewer"}
      onKeyDown={onKeyDown}
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
    >
      <div
        className="relative max-w-full bg-black"
        style={{ aspectRatio: "9 / 16", height: "min(100dvh, calc(100vw * 16 / 9))" }}
        onClick={(e) => {
          e.stopPropagation();
          togglePause();
        }}
        onTouchStart={(e) => {
          touchY.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          if (touchY.current == null) return;
          const dy = e.changedTouches[0].clientY - touchY.current;
          touchY.current = null;
          if (Math.abs(dy) >= SWIPE_PX) go(dy < 0 ? 1 : -1);
        }}
      >
        <video
          key={clip.id}
          ref={videoRef}
          src={clip.src}
          poster={clip.thumbnail}
          className="h-full w-full object-contain"
          autoPlay
          loop
          playsInline
          onLoadedMetadata={(e) => {
            if (seekRef.current > 0) e.currentTarget.currentTime = seekRef.current;
            seekRef.current = 0;
          }}
          onPlay={() => onLoud(true)}
          onPause={() => onLoud(false)}
        />
      </div>

      <button
        ref={closeRef}
        type="button"
        aria-label="Close clip viewer"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className={`${controlClass} absolute right-4 top-4`}
      >
        <XIcon size={22} weight="bold" />
      </button>

      <div className="absolute right-6 top-1/2 hidden -translate-y-1/2 flex-col gap-3 md:flex">
        <button
          type="button"
          aria-label="Previous clip"
          disabled={index === 0}
          onClick={(e) => {
            e.stopPropagation();
            go(-1);
          }}
          className={controlClass}
        >
          <CaretUpIcon size={22} weight="bold" />
        </button>
        <button
          type="button"
          aria-label="Next clip"
          disabled={index === clips.length - 1}
          onClick={(e) => {
            e.stopPropagation();
            go(1);
          }}
          className={controlClass}
        >
          <CaretDownIcon size={22} weight="bold" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
