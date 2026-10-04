"use client";

import { useEffect, useState } from "react";

const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LOWER = UPPER.toLowerCase();
const TICK_MS = 55;
const FIRST_SETTLE = 7;
const SETTLE_STEP = 3;

const isLetter = (ch: string) => ch.toLowerCase() !== ch.toUpperCase();

function glyphAt(ch: string, index: number, tick: number): string {
  const n = Math.abs(Math.imul(index * 31 + tick * 17 + 7, 2654435761)) % 26;
  return ch === ch.toUpperCase() ? UPPER[n] : LOWER[n];
}

export default function SplitFlapText({ text, active }: { text: string; active: boolean }) {
  const [tick, setTick] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!active || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const words = text.split(" ");
    let letterCount = 0;
    for (const w of words) for (const ch of w) if (isLetter(ch)) letterCount += 1;
    const end = FIRST_SETTLE + SETTLE_STEP * letterCount;
    let t = 0;
    setTick(0);
    setRunning(true);
    const id = setInterval(() => {
      t += 1;
      setTick(t);
      if (t >= end) {
        clearInterval(id);
        setRunning(false);
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, [active, text]);

  if (!active || !running) return <>{text}</>;

  let letterIndex = 0;
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {text.split(" ").map((word, wi) => (
          <span key={wi}>
            {wi > 0 && " "}
            <span className="inline-block whitespace-nowrap">
              {[...word].map((ch, ci) => {
                if (!isLetter(ch)) return <span key={ci}>{ch}</span>;
                const i = letterIndex++;
                const settled = tick >= FIRST_SETTLE + SETTLE_STEP * i;
                const shown = settled ? ch : glyphAt(ch, i, tick);
                return (
                  <span key={ci} className="relative inline-block">
                    <span className="invisible">{ch}</span>
                    <span
                      key={settled ? "final" : tick}
                      className={`absolute inset-0 flex items-center justify-center ${settled ? "rsvp-flap-land" : "rsvp-flap"}`}
                    >
                      {shown}
                    </span>
                  </span>
                );
              })}
            </span>
          </span>
        ))}
      </span>
    </>
  );
}
