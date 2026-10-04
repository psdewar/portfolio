const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

export type FlipSource = { rect: DOMRect; fontSize: number };

export const SPLIT_QUERY = "(min-width: 1024px) and (min-height: 500px)";
export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const measureFlip = (el: Element | null): FlipSource | null =>
  el ? { rect: el.getBoundingClientRect(), fontSize: parseFloat(getComputedStyle(el).fontSize) } : null;

export const playFlip = (from: FlipSource | null, to: HTMLElement | null, duration = 350) => {
  if (!from || !to) return;
  const last = to.getBoundingClientRect();
  const scale = from.fontSize / parseFloat(getComputedStyle(to).fontSize);
  const dx = from.rect.left - last.left;
  const dy = from.rect.top - last.top;
  to.animate(
    [
      { transformOrigin: "top left", transform: `translate(${dx}px, ${dy}px) scale(${scale})` },
      { transformOrigin: "top left", transform: "translate(0px, 0px) scale(1)" },
    ],
    { duration, easing: EASE },
  );
};

export const crossfadePoster = (oldPoster: HTMLElement | null, newPoster: HTMLElement | null, duration = 520) => {
  if (!oldPoster || !newPoster?.offsetParent) return;
  const ghost = oldPoster.cloneNode(true) as HTMLElement;
  Object.assign(ghost.style, { position: "absolute", inset: "0", width: "100%", height: "100%", zIndex: "5", pointerEvents: "none" });
  newPoster.appendChild(ghost);
  const anim = ghost.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: EASE, fill: "forwards" });
  anim.onfinish = () => ghost.remove();
};

export const playShift = (from: DOMRect | null, to: HTMLElement | null, duration = 350) => {
  if (!from || !to) return;
  const last = to.getBoundingClientRect();
  const dy = from.top - last.top;
  const visible = (r: { top: number; bottom: number }) => r.bottom > 0 && r.top < window.innerHeight;
  if (!dy || (!visible(from) && !visible(last))) return;
  to.animate([{ transform: `translateY(${dy}px)` }, { transform: "translateY(0)" }], { duration, easing: EASE });
};
