"use client";

import { useEffect, type RefObject } from "react";

const CONTROLS =
  "input:not([type=hidden]), textarea, select, .tbtn, .cc-btn, .cc-rail-hint, .size, .dot, .soc-btn, [role=radio], .teeimg, .ups, .missed-btn, .xp-row";

function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return n === root ? y : null;
}

function measure(step: HTMLElement) {
  if (!step.classList.contains("open")) {
    step.style.removeProperty("--rt");
    step.style.removeProperty("--rb");
    return;
  }
  const body = step.querySelector<HTMLElement>(":scope > .body");
  const controls = body
    ? Array.from(body.querySelectorAll<HTMLElement>(CONTROLS)).filter((el) => el.offsetParent)
    : [];
  if (controls.length === 0) {
    step.style.removeProperty("--rt");
    step.style.removeProperty("--rb");
    return;
  }
  const first = controls[0];
  const last = controls[controls.length - 1];
  const top = offsetWithin(first, step);
  const lastTop = offsetWithin(last, step);
  if (top === null || lastTop === null) return;
  step.style.setProperty("--rt", `${top}px`);
  step.style.setProperty("--rb", `${lastTop + last.offsetHeight}px`);
}

export function useRoadGaps(root: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let raf = 0;
    const run = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.querySelectorAll<HTMLElement>(".st").forEach(measure);
      });
    };
    const ro = new ResizeObserver(run);
    const watch = () => el.querySelectorAll(".st .body, .st .inner").forEach((n) => ro.observe(n));
    watch();
    const mo = new MutationObserver(() => {
      watch();
      run();
    });
    mo.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    window.addEventListener("resize", run);
    run();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("resize", run);
    };
  }, [root]);
}
