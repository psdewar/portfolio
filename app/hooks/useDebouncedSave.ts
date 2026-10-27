"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Show } from "../lib/shows-shared";
import { networkFetch } from "../lib/network-error";

export type SaveState = "idle" | "saving" | "saved" | "error" | "conflict";

export function useDebouncedSave(
  show: Show | null | undefined,
  onSuccess: (slug: string, fields: Partial<Show>) => void,
  delayMs = 800,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const pendingRef = useRef<Partial<Show>>({});
  const [state, setState] = useState<SaveState>("idle");
  const [message, setMessage] = useState("");

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const send = useCallback(
    async (fields: Partial<Show>, force = false) => {
      if (!show) return;
      setState("saving");
      setMessage("");
      try {
        const res = await networkFetch("/api/shows", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: show.slug, ...fields, ...(force ? { force } : {}) }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 409 && data.error === "conflict") {
          pendingRef.current = fields;
          setMessage(`Too close to ${data.conflict.slug} (doors ${data.conflict.doorTime}).`);
          setState("conflict");
          return;
        }
        if (!res.ok) throw new Error();
        onSuccess(show.slug, fields);
        if (data.eventbrite?.error) {
          setMessage("Saved, but Eventbrite didn't update.");
          setState("error");
          return;
        }
        setState("saved");
        setTimeout(() => setState("idle"), 2000);
      } catch {
        setState("error");
      }
    },
    [show, onSuccess],
  );

  const save = useCallback(
    (fields: Partial<Show>) => {
      if (!show) return;
      clearTimeout(timerRef.current);
      setState("saving");
      timerRef.current = setTimeout(() => send(fields), delayMs);
    },
    [show, send, delayMs],
  );

  const saveAnyway = useCallback(() => send(pendingRef.current, true), [send]);

  return { save, saveAnyway, state, message };
}
