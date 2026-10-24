"use client";

import { useEffect, useRef, useState } from "react";
import { useAudio } from "../contexts/AudioContext";

const BEATS = [
  { year: "2011", title: "First beat I ever made", src: "/audio/first-beat-preview.mp3" },
  { year: "2018", title: "First attempt at sampling", src: "/audio/first-try-preview.mp3" },
  { year: "2026", title: "See This Through", note: "unreleased single", src: "/audio/see-this-through-preview.mp3" },
];

const fmt = (s: number) => {
  const t = Math.floor(s || 0);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, "0")}`;
};

export default function BeatPlayer() {
  const { isPlaying, pause } = useAudio();
  const audio = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [durations, setDurations] = useState<number[]>(BEATS.map(() => 0));

  useEffect(() => {
    BEATS.forEach((b, i) => {
      const a = new Audio();
      a.preload = "metadata";
      a.addEventListener("loadedmetadata", () => {
        setDurations((prev) => prev.map((d, j) => (j === i ? a.duration : d)));
      });
      a.src = b.src;
    });
  }, []);

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const tick = () => {
      const a = audio.current;
      if (a) {
        setElapsed(a.currentTime);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  useEffect(() => {
    if (!isPlaying) return;
    audio.current?.pause();
    setPlaying(false);
  }, [isPlaying]);

  const load = (i: number) => {
    const a = audio.current;
    if (!a) return;
    a.src = BEATS[i].src;
    setCurrent(i);
    setElapsed(0);
    setPlaying(true);
    a.play().catch(() => setPlaying(false));
  };

  const toggle = (i: number) => {
    const a = audio.current;
    if (!a) return;
    if (current === i && playing) {
      a.pause();
      setPlaying(false);
      return;
    }
    if (isPlaying) pause();
    if (current === i) {
      setPlaying(true);
      a.play().catch(() => setPlaying(false));
      return;
    }
    load(i);
  };

  const onEnded = () => {
    if (current !== null && current < BEATS.length - 1) {
      load(current + 1);
      return;
    }
    setCurrent(null);
    setPlaying(false);
    setElapsed(0);
  };

  const dur = current === null ? 0 : durations[current];
  const lead = Math.min(2, dur * 0.15);
  const span = dur - lead;
  const clamp = (n: number) => Math.min(1, Math.max(0, n));
  const t = dur > 0 && lead > 0 ? clamp((elapsed - span) / lead) : 0;

  return (
    <div className="mt-9 flex flex-col gap-5">
      <audio
        ref={audio}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={onEnded}
      />
      {BEATS.map((b, i) => {
        const on = current === i && playing;
        const label = on ? "Pause" : "Play";
        const fill =
          current === null ? 0 : current > i ? 1 : current === i && span > 0 ? clamp(elapsed / span) : 0;
        const isCur = current === i;
        const isNext = current !== null && current + 1 === i;
        let top = 0;
        let bottom = 100;
        if (isCur && playing) {
          top = t * 100;
          bottom = 0;
        } else if (isNext) {
          bottom = (1 - t) * 100;
        }
        return (
          <div key={b.src} className="relative flex items-start gap-4">
            <span className="w-12 shrink-0 font-semibold leading-[44px] tabular-nums text-black dark:text-white">
              {b.year}
            </span>
            <button
              type="button"
              aria-pressed={on}
              aria-label={`${on ? "Pause" : "Play"} ${b.title}, ${b.year}`}
              onClick={() => toggle(i)}
              className="relative z-10 h-[44px] min-h-[44px] w-[88px] flex-none rounded-full border border-neutral-500 bg-white font-semibold leading-none text-black focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-black dark:border-neutral-400 dark:bg-gray-900 dark:text-white dark:focus-visible:outline-white"
            >
              {label}
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-px flex items-center justify-center rounded-full bg-black text-white dark:bg-white dark:text-black"
                style={{ clipPath: `inset(${top}% 0 ${bottom}% 0)` }}
              >
                {label}
              </span>
            </button>
            <span className="min-w-0 pt-[7px]">
              {b.note ? `${b.title} (${b.note})` : b.title}
              <small className="block text-[15px] tabular-nums text-neutral-500 dark:text-neutral-400">
                {fmt(current === i ? elapsed : 0)} / {fmt(durations[i])}
              </small>
            </span>
            {i < BEATS.length - 1 && (
              <span
                aria-hidden
                className="pointer-events-none absolute left-[108px] top-[44px] h-[calc(100%-24px)] w-px bg-neutral-300 dark:bg-neutral-700"
              >
                <span
                  className="absolute inset-0 origin-top bg-black dark:bg-white"
                  style={{ transform: `scaleY(${fill})` }}
                />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
