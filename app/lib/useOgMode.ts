"use client";
import { useEffect, useState } from "react";

// Returns true on the client after first paint when the URL has ?og=true.
// Pages apply this to a wrapper element (not <html>) — React 18 hydration
// reconciles <html> attributes against the React tree and strips externally-added classes.
export function useOgMode(): boolean {
  const [isOg, setIsOg] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("og") === "true") {
      setIsOg(true);
    }
  }, []);
  return isOg;
}
