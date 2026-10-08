"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// `?intro=1` opens an intro video on load. Clearing drops only `intro`, so UTM tags survive.
export function useIntroAutoOpen() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const autoOpen = searchParams.get("intro") === "1";

  const clearIntro = useCallback(() => {
    if (searchParams.get("intro") !== "1") return;
    const next = new URLSearchParams(searchParams.toString());
    next.delete("intro");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [searchParams, router, pathname]);

  return { autoOpen, clearIntro };
}
