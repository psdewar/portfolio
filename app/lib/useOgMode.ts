"use client";
import { useEffect, useState } from "react";

export function useOgMode(): boolean {
  const [isOg, setIsOg] = useState(false);
  useEffect(() => {
    const og = new URLSearchParams(window.location.search).get("og") === "true";
    if (!og) return;
    setIsOg(true);
    document.documentElement.classList.add("og-mode");
    return () => document.documentElement.classList.remove("og-mode");
  }, []);
  return isOg;
}
