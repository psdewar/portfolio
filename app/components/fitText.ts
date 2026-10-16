import { useLayoutEffect } from "react";

export const overflowsX = (n: HTMLElement) => n.scrollWidth > n.clientWidth + 1;

export function lineCount(n: HTMLElement) {
  const lh = parseFloat(getComputedStyle(n).lineHeight);
  return lh ? Math.round(n.offsetHeight / lh) : 1;
}

export function shrinkToFit(
  n: HTMLElement,
  fromRem: number,
  toRem: number,
  fits: (n: HTMLElement) => boolean = (el) => !overflowsX(el),
  step = 0.05,
) {
  let fs = fromRem;
  n.style.fontSize = `${fs}rem`;
  while (!fits(n) && fs > toRem) {
    fs = Math.max(fs - step, toRem);
    n.style.fontSize = `${fs}rem`;
  }
  return fs;
}

export function useFontFit(fit: () => void, deps: React.DependencyList) {
  useLayoutEffect(() => {
    fit();
    document.fonts?.ready.then(fit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
