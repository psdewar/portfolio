"use client";

import { useEffect } from "react";

export default function HashScroll() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const stop = () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };

    // The moment the user scrolls/taps, they win — never yank them back.
    const opts = { once: true, passive: true } as const;
    window.addEventListener("wheel", stop, opts);
    window.addEventListener("touchstart", stop, opts);
    window.addEventListener("keydown", stop, { once: true });

    let tries = 0;
    const run = () => {
      if (cancelled) return;
      document.getElementById(id)?.scrollIntoView();
      if (++tries < 6) timers.push(setTimeout(run, 150));
    };
    timers.push(setTimeout(run, 0));

    return () => {
      stop();
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
    };
  }, []);
  return null;
}
