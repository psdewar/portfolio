import { useEffect, useRef, type RefObject } from "react";

const MOBILE = "(max-width: 639px)";
const REDUCED = "(prefers-reduced-motion: reduce)";
const EASE = "cubic-bezier(0.32,0.72,0,1)";
const SLOP = 16;
const SCROLL_LOCK_MS = 100;
const TOP_EPSILON_PX = 1;
const FLING_MIN_PX = 96;
const RESISTANCE = 0.85;
const BACKDROP_ALPHA = 0.7;
const BACKDROP_BLUR_PX = 4;
const SETTLE_MS = 200;
const CLOSE_DISTANCE_PX = 120;
const VELOCITY_PX_PER_MS = 0.5;
const VELOCITY_WINDOW_MS = 100;

type Sample = { t: number; y: number };

export function useSwipeToDismiss(
  panelRef: RefObject<HTMLElement | null>,
  {
    enabled,
    onClose,
    backdropRef,
  }: {
    enabled: boolean;
    onClose: () => void;
    backdropRef?: RefObject<HTMLElement | null>;
  },
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const panel = panelRef.current;
    if (!enabled || !panel) return;
    const mobile = window.matchMedia(MOBILE);
    const reduced = window.matchMedia(REDUCED);

    let armed = false;
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let dy = 0;
    let samples: Sample[] = [];
    let lastScroll = -Infinity;
    let prevScrollTop = panel.scrollTop;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const backdrop = () => backdropRef?.current ?? null;

    const clearStyles = () => {
      panel.style.transform = "";
      panel.style.transition = "";
      const b = backdrop();
      if (b) {
        b.style.backgroundColor = "";
        b.style.backdropFilter = "";
        b.style.transition = "";
      }
    };

    const fadeBackdrop = (visible: number) => {
      const b = backdrop();
      if (!b) return;
      b.style.backgroundColor = `rgba(0,0,0,${BACKDROP_ALPHA * visible})`;
      b.style.backdropFilter = `blur(${BACKDROP_BLUR_PX * visible}px)`;
    };

    const settle = (transform: string, visible: number, done: () => void) => {
      const transition = `transform ${SETTLE_MS}ms ${EASE}`;
      panel.style.transition = transition;
      panel.style.transform = transform;
      const b = backdrop();
      if (b) b.style.transition = `background-color ${SETTLE_MS}ms ${EASE}, backdrop-filter ${SETTLE_MS}ms ${EASE}`;
      fadeBackdrop(visible);
      timer = setTimeout(done, SETTLE_MS);
    };

    const snapBack = () => {
      if (reduced.matches) {
        clearStyles();
        return;
      }
      settle("translateY(0)", 1, clearStyles);
    };

    const close = () => {
      if (reduced.matches) {
        onCloseRef.current();
        return;
      }
      settle("translateY(100%)", 0, () => onCloseRef.current());
    };

    const velocity = () => {
      const last = samples[samples.length - 1];
      if (!last) return 0;
      const first = samples.find((s) => last.t - s.t <= VELOCITY_WINDOW_MS) ?? last;
      const dt = last.t - first.t;
      return dt > 0 ? (last.y - first.y) / dt : 0;
    };

    const reset = () => {
      armed = false;
      dragging = false;
      dy = 0;
      samples = [];
    };

    const onStart = (e: TouchEvent) => {
      reset();
      if (!mobile.matches || e.touches.length !== 1 || panel.scrollTop > TOP_EPSILON_PX) return;
      if (performance.now() - lastScroll < SCROLL_LOCK_MS) return;
      clearTimeout(timer);
      armed = true;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (!armed) return;
      if (e.touches.length !== 1 || panel.scrollTop > TOP_EPSILON_PX) {
        armed = false;
        return;
      }
      const touch = e.touches[0];
      const moveY = touch.clientY - startY;
      const moveX = touch.clientX - startX;
      if (!dragging) {
        if (moveY < 0 || (Math.abs(moveX) > SLOP && Math.abs(moveX) > moveY)) {
          armed = false;
          return;
        }
        if (moveY > 0 && moveY > Math.abs(moveX)) e.preventDefault();
        if (moveY < SLOP || moveY <= Math.abs(moveX)) return;
        dragging = true;
        panel.style.transition = "none";
        const b = backdrop();
        if (b) b.style.transition = "none";
      }
      e.preventDefault();
      dy = Math.max(0, moveY);
      samples.push({ t: e.timeStamp, y: touch.clientY });
      if (reduced.matches) return;
      panel.style.transform = `translateY(${dy * RESISTANCE}px)`;
      fadeBackdrop(1 - Math.min(1, dy / panel.offsetHeight));
    };

    const onEnd = () => {
      if (!dragging) {
        reset();
        return;
      }
      const shouldClose =
        dy > CLOSE_DISTANCE_PX ||
        (dy >= FLING_MIN_PX && velocity() > VELOCITY_PX_PER_MS);
      reset();
      if (shouldClose) close();
      else snapBack();
    };

    const onCancel = () => {
      const wasDragging = dragging;
      reset();
      if (wasDragging) snapBack();
    };

    const onScroll = () => {
      const top = panel.scrollTop;
      if (top > TOP_EPSILON_PX || prevScrollTop > TOP_EPSILON_PX) lastScroll = performance.now();
      prevScrollTop = top;
    };

    panel.addEventListener("scroll", onScroll, { passive: true });
    panel.addEventListener("touchstart", onStart, { passive: true });
    panel.addEventListener("touchmove", onMove, { passive: false });
    panel.addEventListener("touchend", onEnd);
    panel.addEventListener("touchcancel", onCancel);
    return () => {
      panel.removeEventListener("scroll", onScroll);
      panel.removeEventListener("touchstart", onStart);
      panel.removeEventListener("touchmove", onMove);
      panel.removeEventListener("touchend", onEnd);
      panel.removeEventListener("touchcancel", onCancel);
      clearTimeout(timer);
      clearStyles();
    };
  }, [enabled, panelRef, backdropRef]);
}
