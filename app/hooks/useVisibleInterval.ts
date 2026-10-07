"use client";

import { useEffect, useRef } from "react";

const RETURN_DEDUPE_MS = 500;

export function useVisibleInterval(callback: () => void, ms: number | null) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    let lastReturn = 0;

    const stop = () => {
      if (timer === null) return;
      clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      if (ms !== null) timer = setInterval(() => callbackRef.current(), ms);
    };
    const onReturn = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastReturn < RETURN_DEDUPE_MS) return;
      lastReturn = now;
      callbackRef.current();
      start();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") onReturn();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    window.addEventListener("focus", onReturn);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      window.removeEventListener("focus", onReturn);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [ms]);
}
