"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Show } from "../lib/shows";

export type SaveState = "idle" | "saving" | "saved";

export function useDebouncedSave(
  show: Show | null | undefined,
  onSuccess: (slug: string, fields: Partial<Show>) => void,
  delayMs = 800,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const [state, setState] = useState<SaveState>("idle");

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const save = useCallback(
    (fields: Partial<Show>) => {
      if (!show) return;
      clearTimeout(timerRef.current);
      setState("saving");
      timerRef.current = setTimeout(async () => {
        const res = await fetch("/api/shows", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: show.slug, ...fields }),
        });
        if (res.ok) {
          onSuccess(show.slug, fields);
          setState("saved");
          setTimeout(() => setState("idle"), 2000);
        } else {
          setState("idle");
        }
      }, delayMs);
    },
    [show, onSuccess, delayMs],
  );

  return { save, state };
}
