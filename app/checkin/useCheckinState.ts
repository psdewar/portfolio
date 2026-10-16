"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { CHECKIN_STEPS, type CheckinStep } from "./steps";
import { networkFetch } from "../lib/network-error";
import { MAX_NAME_LENGTH } from "../lib/name";

export type CheckinFields = { name: string; email: string; phone: string };

export type Stored = CheckinFields & {
  ticketNo: number | null;
  rsvpd: boolean;
  checkinId: string | null;
  steps: Partial<Record<CheckinStep, string>>;
  skipped: boolean;
  confirmed: boolean;
};

const EMPTY: Stored = {
  name: "",
  email: "",
  phone: "",
  ticketNo: null,
  rsvpd: false,
  checkinId: null,
  steps: {},
  skipped: false,
  confirmed: false,
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isValidCheckin = ({ name, email }: CheckinFields) =>
  !!name.trim() && EMAIL.test(email.trim());

export const isCheckedIn = (s: Stored) => s.confirmed;

function read(slug: string): Stored | null {
  try {
    const raw = localStorage.getItem(`checkin:${slug}`) ?? localStorage.getItem(`ticket:${slug}`);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return { ...EMPTY, ...saved, confirmed: saved.confirmed ?? !!saved.email };
  } catch {
    return null;
  }
}

function write(slug: string, value: Stored) {
  try {
    localStorage.setItem(`checkin:${slug}`, JSON.stringify(value));
  } catch {}
}

const post = (url: string, body: unknown) =>
  networkFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export function useCheckinState({
  slug,
  preview,
  capture,
  ticketNoOverride,
  rsvpdOverride,
}: {
  slug: string;
  preview: boolean;
  capture: boolean;
  ticketNoOverride: number | null;
  rsvpdOverride: boolean;
}) {
  const [stored, setStored] = useState<Stored>({
    ...EMPTY,
    ticketNo: ticketNoOverride ?? (preview ? 1 : null),
    rsvpd: rsvpdOverride,
  });
  const [restored, setRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const ref = useRef(stored);
  const skipId = useRef<string | null>(null);
  ref.current = stored;

  const commit = useCallback(
    (patch: Partial<Stored>) => {
      const next = { ...ref.current, ...patch };
      ref.current = next;
      setStored(next);
      if (!capture) write(slug, next);
      return next;
    },
    [slug, capture],
  );

  useEffect(() => {
    const fresh = new URLSearchParams(window.location.search).has("fresh");
    const saved = capture || fresh ? null : read(slug);
    if (saved) {
      setStored(saved);
      ref.current = saved;
      setRestored(isCheckedIn(saved) || saved.skipped);
      if (saved.checkinId && !preview) {
        fetch(`/api/checkin/step?id=${saved.checkinId}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data?.steps) commit({ steps: { ...ref.current.steps, ...data.steps } });
          })
          .catch(() => {});
      }
    } else if (!capture) {
      let email = "";
      try {
        email = localStorage.getItem("attendeeEmail") ?? "";
      } catch {}
      if (email) setStored((s) => ({ ...s, email }));
      fetch("/api/me")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.name) setStored((s) => ({ ...s, name: s.name || String(data.name).slice(0, MAX_NAME_LENGTH) }));
        })
        .catch(() => {});
    }
    setHydrated(true);
  }, [slug, capture, preview, commit]);

  const track = useCallback(
    (event: string, props: Record<string, unknown> = {}) => {
      posthog.capture(event, {
        ...props,
        show_slug: slug,
        checkin_id: ref.current.checkinId,
      });
    },
    [slug],
  );

  const setFields = (patch: Partial<CheckinFields>) => setStored((s) => ({ ...s, ...patch }));

  const submit = async (website: string) => {
    const fields = ref.current;
    const email = fields.email.trim().toLowerCase();
    const body = { name: fields.name.trim(), email, phone: fields.phone.trim() };
    if (preview) {
      commit({ ...body, confirmed: true, checkinId: fields.checkinId ?? crypto.randomUUID() });
    } else {
      const res = await post("/api/checkin", {
        slug,
        ...body,
        website,
        ...(fields.checkinId ? { checkinId: fields.checkinId } : {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
      try {
        localStorage.setItem("attendeeEmail", email);
      } catch {}
      posthog.identify(email);
      commit({
        ...body,
        confirmed: true,
        ticketNo: typeof data.ticketNo === "number" ? data.ticketNo : fields.ticketNo,
        rsvpd: !!data.rsvpd || fields.rsvpd,
        checkinId: data.checkinId ?? fields.checkinId,
        steps: { ...ref.current.steps, ...(data.steps ?? {}) },
      });
    }
    track("checkin_step_done", { step: "checkin" });
  };

  const skip = async () => {
    if (preview) {
      commit({ skipped: true, checkinId: crypto.randomUUID() });
    } else {
      skipId.current ??= crypto.randomUUID();
      const res = await post("/api/checkin/skip", { slug, website: "", checkinId: skipId.current });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
      commit({
        skipped: true,
        ticketNo: typeof data.ticketNo === "number" ? data.ticketNo : null,
        checkinId: data.checkinId ?? null,
        steps: data.steps ?? {},
      });
    }
    track("checkin_skipped");
  };

  const markStep = useCallback(
    (step: CheckinStep) => {
      if (!CHECKIN_STEPS.includes(step) || ref.current.steps[step]) return;
      commit({ steps: { ...ref.current.steps, [step]: new Date().toISOString() } });
      track("checkin_step_done", { step });
      const id = ref.current.checkinId;
      if (id && !preview) post("/api/checkin/step", { checkinId: id, step }).catch(() => {});
    },
    [commit, preview, track],
  );

  return { stored, setFields, hydrated, restored, submit, skip, markStep };
}
