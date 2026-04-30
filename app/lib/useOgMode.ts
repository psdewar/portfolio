"use client";
import { useEffect, useState } from "react";

export function useOgMode(): boolean {
  const [isOg] = useState(() => {
    if (typeof window === "undefined") return false;
    return new URLSearchParams(window.location.search).get("og") === "true";
  });
  useEffect(() => {
    if (!isOg) return;
    document.documentElement.classList.add("og-mode");
    return () => document.documentElement.classList.remove("og-mode");
  }, [isOg]);
  return isOg;
}
