import { useEffect, useState } from "react";

// True once the page can reveal a font-dependent animated element without a flash (load → fonts → 2 paints, 1.5s backstop).
export function useDocumentReady() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const reveal = () => {
      if (!cancelled) setReady(true);
    };
    const afterLoad = () => {
      (document.fonts?.ready ?? Promise.resolve()).then(() =>
        requestAnimationFrame(() => requestAnimationFrame(reveal)),
      );
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    const fallback = setTimeout(reveal, 1500);
    return () => {
      cancelled = true;
      clearTimeout(fallback);
      window.removeEventListener("load", afterLoad);
    };
  }, []);
  return ready;
}
