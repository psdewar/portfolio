import { useEffect, useSyncExternalStore } from "react";

let locks = 0;
let saved = { html: "", body: "" };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    if (locks++ === 0) {
      saved = { html: html.style.overflow, body: body.style.overflow };
      html.style.overflow = "hidden";
      body.style.overflow = "hidden";
      emit();
    }
    return () => {
      if (--locks === 0) {
        html.style.overflow = saved.html;
        body.style.overflow = saved.body;
        emit();
      }
    };
  }, [active]);
}

export function useScrollLocked() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => locks > 0,
    () => false,
  );
}
