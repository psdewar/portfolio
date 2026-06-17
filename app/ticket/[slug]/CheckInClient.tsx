"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useDocumentReady } from "../../hooks/useDocumentReady";

const PAPER = "#eef0f3";
const INK = "#262b3f";
const EDGE = "#d4a553";
const MUSTARD = "#d4a553";
const STAMP = "#c0392b";
// Metallic gold: a bright highlight band through the middle reads as a sheen.
const SHINE_GOLD =
  "linear-gradient(150deg, #b07f33 0%, #e8c878 26%, #f8ecb6 48%, #d4a553 64%, #a8772f 100%)";
// Distress mask: fractal-noise alpha so the stamp ink looks worn, not a flat fill.
const STAMP_TEXTURE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='110'%3E%3Cfilter id='t'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.16 0.22' numOctaves='3' seed='7' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -1.1 1.32'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23t)'/%3E%3C/svg%3E\")";

function Star({ size = "0.66em" }: { size?: string }) {
  return (
    <svg viewBox="0 0 10 10" fill={MUSTARD} aria-hidden style={{ width: size, height: size, flexShrink: 0 }}>
      <path d="M5 0L6.4 3.6L10 5L6.4 6.4L5 10L3.6 6.4L0 5L3.6 3.6Z" />
    </svg>
  );
}

// Deterministic barcode bar widths derived from the ticket number.
function seededBarWidths(value: string): number[] {
  let seed = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    seed = Math.imul(seed ^ value.charCodeAt(i), 16777619) >>> 0;
  }
  const out: number[] = [];
  for (let i = 0; i < 64; i++) {
    seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
    out.push(((seed >>> 16) % 3) + 1);
  }
  return out;
}

interface Props {
  slug: string;
  city: string;
  region?: string | null;
  date: string;
  venueLabel: string | null;
  preview?: boolean;
  capture?: boolean;
  ticketNoOverride?: number | null;
  rsvpdOverride?: boolean;
}

export default function CheckInClient({
  slug,
  city,
  region,
  date,
  venueLabel,
  preview,
  capture,
  ticketNoOverride,
  rsvpdOverride,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot: only bots fill it
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState("");
  const [scale, setScale] = useState(1);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [ticketNo, setTicketNo] = useState<number | null>(ticketNoOverride ?? (preview ? 1 : null));
  const [rsvpd, setRsvpd] = useState<boolean>(!!rsvpdOverride);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [snapped, setSnapped] = useState(false);
  const [revealButton, setRevealButton] = useState(false);
  const [saveAttempted, setSaveAttempted] = useState(false);
  const ready = useDocumentReady();
  const [ticketBlob, setTicketBlob] = useState<{ url: string; blob: Blob } | null>(null);
  const ticketRef = useRef<HTMLDivElement>(null);
  const restingScale = useRef(1);
  const cityRef = useRef<HTMLParagraphElement>(null);
  const prefetched = useRef(false);
  const restored = useRef(false);

  useEffect(() => {
    if (capture) return; // keepsake render fills the form itself
    // Restore a prior check-in so Back lands on their ticket; ?fresh=1 skips it for testing.
    const skip = new URLSearchParams(window.location.search).has("fresh");
    try {
      const raw = skip ? null : localStorage.getItem(`ticket:${slug}`);
      if (raw) {
        const t = JSON.parse(raw);
        if (t.name) setName(t.name);
        if (t.email) setEmail(t.email);
        if (typeof t.ticketNo === "number") setTicketNo(t.ticketNo);
        if (t.rsvpd) setRsvpd(true);
        restored.current = true;
        setStatus("done");
        setRevealButton(true);
        return;
      }
    } catch {
      // ignore malformed cache and fall through to prefill
    }
    const e = localStorage.getItem("attendeeEmail");
    const n = localStorage.getItem("liveCommenterName");
    if (e) setEmail(e);
    if (n) setName(n);
  }, [slug, capture]);

  useEffect(() => {
    const fit = () => {
      const el = ticketRef.current;
      if (!el) return;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      if (!w || !h) return;
      const vv = window.visualViewport;
      const visH = vv?.height ?? window.innerHeight;
      if (visH < window.innerHeight * 0.75) {
        setKeyboardOpen(true);
        setScale(restingScale.current);
        return;
      }
      setKeyboardOpen(false);
      const vw = vv?.width ?? window.innerWidth;
      const s = Math.min(Math.max(Math.min((vw - 16) / w, (visH - 16) / h), 0.5), 2.4);
      restingScale.current = s;
      setScale(s);
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    window.visualViewport?.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("resize", fit);
      window.visualViewport?.removeEventListener("resize", fit);
    };
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const prevHtml = html.style.overflow;
    const prevBody = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    const el = cityRef.current;
    if (!el) return;
    const fit = () => {
      let fs = 2.5;
      el.style.fontSize = `${fs}rem`;
      while (el.scrollWidth > el.clientWidth + 1 && fs > 1.2) {
        fs -= 0.05;
        el.style.fontSize = `${fs}rem`;
      }
    };
    fit();
    document.fonts?.ready.then(fit);
  }, [city, region]);

  const valid = !!name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const venueName = venueLabel ? venueLabel.split(",")[0].trim() : null;
  const d = new Date(date + "T12:00:00");
  const ticketDate = d
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase();
  const serial = date.replace(/-/g, "");
  const seq = ticketNo != null ? String(ticketNo).padStart(4, "0") : "----";
  const ticketLabel = `${serial}${seq}`;
  const barWidths = seededBarWidths(ticketLabel);
  const display = { fontFamily: "var(--font-parkinsans), sans-serif" } as const;
  const mono = { fontFamily: "var(--font-space-mono), monospace" } as const;
  // Side notches + perforation holes mark the tear line, punched via intersect (transparent to backdrop).
  const dashRow = (y: string) =>
    `radial-gradient(3px 1.5px at 6px ${y}, #0000 92%, #000) 0 0/12px 100% repeat-x`;
  const bodyMask =
    "radial-gradient(13px at left bottom, #0000 98%, #000)," +
    "radial-gradient(13px at right bottom, #0000 98%, #000)," +
    dashRow("100%");
  const stubMask =
    "radial-gradient(13px at left top, #0000 98%, #000)," +
    "radial-gradient(13px at right top, #0000 98%, #000)," +
    dashRow("0%");

  const checkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status === "loading") return;
    setStatus("loading");
    setError("");
    if (preview) {
      localStorage.setItem(
        `ticket:${slug}`,
        JSON.stringify({ name: name.trim(), email: email.trim(), ticketNo, rsvpd }),
      );
      setStatus("done");
      return;
    }
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: email.trim(), name: name.trim(), website }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        setStatus("idle");
        return;
      }
      const no = typeof data.ticketNo === "number" ? data.ticketNo : null;
      if (no !== null) setTicketNo(no);
      if (data.rsvpd) setRsvpd(true);
      const emailLower = email.trim().toLowerCase();
      localStorage.setItem("attendeeEmail", emailLower);
      localStorage.setItem("liveCommenterName", name.trim());
      localStorage.setItem(
        `ticket:${slug}`,
        JSON.stringify({ name: name.trim(), email: emailLower, ticketNo: no, rsvpd: !!data.rsvpd }),
      );
      posthog.identify(emailLower);
      setStatus("done");
    } catch {
      setError("Something went wrong. Try again.");
      setStatus("idle");
    }
  };

  const triggerDownload = (url: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = "ground-up-ticket.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const fetchTicketBlob = async (): Promise<Blob | null> => {
    try {
      const res = await fetch("/api/ticket-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name: name.trim(), email: email.trim(), ticketNo, rsvpd }),
      });
      return res.ok ? await res.blob() : null;
    } catch {
      return null;
    }
  };

  const prefetchTicket = async () => {
    const blob = await fetchTicketBlob();
    if (blob) setTicketBlob({ url: URL.createObjectURL(blob), blob });
  };

  // Tap hits the OS share sheet (mobile) or download (desktop); the blob is prefetched so share fires in-gesture.
  const saveTicket = () => {
    if (!ticketBlob) return;
    const file = new File([ticketBlob.blob], "ground-up-ticket.png", { type: "image/png" });
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    if (coarse && navigator.canShare?.({ files: [file] })) {
      // The share API never reports which target they chose, so we just surface the next step after.
      navigator
        .share({ files: [file] })
        .then(() => setSaveAttempted(true))
        .catch(() => {});
    } else {
      triggerDownload(ticketBlob.url);
      setTimeout(() => URL.revokeObjectURL(ticketBlob.url), 1000);
      setSaveAttempted(true);
    }
  };

  // On check-in, count down 3 → 2 → 1, then snap (flash + auto-grab the keepsake).
  useEffect(() => {
    if (status === "done" && !capture && !restored.current && countdown === null && !snapped) {
      setCountdown(3);
    }
  }, [status, capture, countdown, snapped]);

  useEffect(() => {
    if (countdown === null) return;
    const t = setTimeout(() => {
      if (countdown <= 1) {
        setCountdown(null);
        setSnapped(true);
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  // Prefetch the keepsake on admit so the "Keep Your Ticket" tap and its in-gesture share are instant.
  useEffect(() => {
    if (status !== "done" || capture || prefetched.current) return;
    prefetched.current = true;
    prefetchTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, capture]);

  // Reveal the button only once the flash and rip have finished.
  useEffect(() => {
    if (!snapped) return;
    const t = setTimeout(() => setRevealButton(true), 1400);
    return () => clearTimeout(t);
  }, [snapped]);

  const fieldStyle = {
    fontFamily: "var(--font-parkinsans), sans-serif",
    fontWeight: 400,
    color: INK,
    borderBottom: `1px solid ${INK}55`,
  } as const;

  return (
    <div
      className={`fixed inset-0 z-[60] ${keyboardOpen ? "overflow-y-auto" : "overflow-hidden"}`}
      style={{
        background: `radial-gradient(130% 85% at 50% -15%, #e3bd72, ${EDGE})`,
        touchAction: keyboardOpen ? "pan-y" : "none",
        overscrollBehavior: "none",
        bottom: "var(--player-h, 0px)",
      }}
    >
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 50 50"
            aria-label="Getting your ticket"
            style={{ animation: "ticket-spin 0.7s linear infinite", willChange: "transform" }}
          >
            <circle cx="25" cy="25" r="20" fill="none" stroke={INK} strokeWidth="4" strokeOpacity="0.18" />
            <path d="M25 5 A20 20 0 0 1 45 25" fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          </svg>
        </div>
      )}
      {countdown !== null && countdown <= 2 && (
        <div
          className="fixed left-1/2 top-1/2 z-[75] flex max-w-[88vw] -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-2xl px-9 py-7 text-center shadow-2xl"
          style={{ ...mono, background: INK, color: PAPER }}
          role="status"
        >
          <span className="text-sm uppercase tracking-[0.22em]">Taking snapshot of your ticket</span>
          <span className="text-6xl font-bold leading-none">{countdown}</span>
        </div>
      )}
      <div className="flex h-full items-center justify-center p-4">
        <div style={{ transform: `scale(${scale})`, transition: "transform 0.18s ease-out" }}>
          <div
            ref={ticketRef}
            className={`relative w-[300px] ${ready ? "ticket-enter" : ""}`}
            style={ready ? undefined : { opacity: 0 }}
          >
            {rsvpd && (
              <div
                className="absolute left-0 top-0 z-30 overflow-hidden"
                style={{ width: 84, height: 84, pointerEvents: "none" }}
                aria-label="RSVP honored, thanks for showing up"
              >
                <div
                  style={{
                    ...mono,
                    position: "absolute",
                    width: 118,
                    left: -29,
                    top: 19,
                    padding: "3px 0",
                    textAlign: "center",
                    background: SHINE_GOLD,
                    color: INK,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    transform: "rotate(-45deg)",
                  }}
                >
                  RSVP&apos;D
                </div>
              </div>
            )}
            <div
              className="relative z-10 ticket-shadow"
              style={{
                background: PAPER,
                borderRadius: "3px 3px 0 0",
                WebkitMask: bodyMask,
                mask: bodyMask,
                WebkitMaskComposite: "source-in",
                maskComposite: "intersect",
              }}
            >
              <div className="px-6 pb-5 pt-7">
                <div className="text-center" style={{ color: INK }}>
                  <div
                    className="flex items-center justify-center gap-3 text-[10px] uppercase"
                    style={{ ...mono, letterSpacing: "0.35em" }}
                  >
                    <Star />
                    <span>Admit One</span>
                    <Star />
                  </div>

                  <h1
                    className="mt-3 whitespace-nowrap font-extrabold uppercase leading-[0.86]"
                    style={{ ...display, fontSize: "2.5rem", color: INK }}
                  >
                    From The
                    <br />
                    Ground Up
                  </h1>

                  <span className="mt-4 flex items-center gap-2" aria-hidden>
                    <span className="h-px flex-1" style={{ background: `${INK}55` }} />
                    <Star />
                    <span className="h-px flex-1" style={{ background: `${INK}55` }} />
                  </span>

                  <p
                    ref={cityRef}
                    className="mt-2 whitespace-nowrap font-extrabold uppercase leading-none"
                    style={{ ...display, fontSize: "2.5rem", color: INK }}
                  >
                    {region ? `${city}, ${region}` : city}
                  </p>
                  <p className="mt-2 text-[10px] uppercase" style={{ ...mono, letterSpacing: "0.18em" }}>
                    {ticketDate}
                  </p>
                  {venueName && (
                    <p
                      className="mt-2 text-[10px] uppercase"
                      style={{ ...mono, letterSpacing: "0.2em", color: `${INK}99` }}
                    >
                      {venueName}
                    </p>
                  )}
                </div>

                <form onSubmit={checkIn} className="mt-6">
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    aria-hidden="true"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
                  />
                  <div className="relative">
                    {status === "done" && (
                      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center">
                        <span
                          className="stamp-down font-extrabold uppercase leading-none"
                          style={{
                            ...display,
                            fontSize: "2.5rem",
                            letterSpacing: "0.02em",
                            color: STAMP,
                            border: `5px double ${STAMP}`,
                            padding: "0.12em 0.34em",
                            borderRadius: 8,
                            transform: "rotate(-13deg)",
                            WebkitMaskImage: STAMP_TEXTURE,
                            maskImage: STAMP_TEXTURE,
                            WebkitMaskSize: "100% 100%",
                            maskSize: "100% 100%",
                          }}
                        >
                          Admitted
                        </span>
                      </div>
                    )}
                    <label
                      className="block text-[10px] uppercase"
                      style={{ ...mono, color: `${INK}99`, letterSpacing: "0.2em" }}
                    >
                      This ticket admits
                    </label>
                    <input
                      type="text"
                      autoComplete="name"
                      enterKeyHint="next"
                      placeholder="your name"
                      value={name}
                      disabled={status === "done"}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 w-full bg-transparent pb-1.5 text-left text-base outline-none placeholder:opacity-40"
                      style={fieldStyle}
                    />
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      enterKeyHint="done"
                      placeholder="your email"
                      value={email}
                      disabled={status === "done"}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-3 w-full bg-transparent pb-1.5 text-left text-base outline-none placeholder:opacity-40"
                      style={fieldStyle}
                    />
                  </div>
                  {error && (
                    <p className="mt-2 text-center text-xs" style={{ ...mono, color: INK }}>
                      {error}
                    </p>
                  )}
                  {status === "done" ? (
                    revealButton ? (
                      <>
                        <button
                          type="button"
                          onClick={saveTicket}
                          disabled={!ticketBlob || saveAttempted}
                          className={`${ticketBlob && !saveAttempted ? "keep-btn " : ""}mt-6 w-full py-3.5 text-sm uppercase tracking-[0.25em]`}
                          style={{
                            ...mono,
                            background: ticketBlob && !saveAttempted ? MUSTARD : "#cbced5",
                            color: ticketBlob && !saveAttempted ? INK : "#7e838f",
                            border: `2px solid ${ticketBlob && !saveAttempted ? INK : "#b1b6bf"}`,
                            borderRadius: 2,
                          }}
                        >
                          {ticketBlob ? "Keep Your Ticket" : "Preparing…"}
                        </button>
                        {saveAttempted && (
                          <button
                            type="button"
                            onClick={() => router.push("/support")}
                            className="mt-3 flex w-full items-center justify-center gap-2 text-xs uppercase tracking-[0.2em]"
                            style={{ ...mono, color: INK }}
                          >
                            <span style={{ textDecoration: "underline", textUnderlineOffset: 4 }}>
                              Fund the Tour
                            </span>
                            <svg width="22" height="10" viewBox="0 0 22 10" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                              <path d="M0 5H17.5" stroke={INK} strokeWidth="1.6" />
                              <path d="M13.5 1L19.5 5L13.5 9" stroke={INK} strokeWidth="1.6" strokeLinecap="square" strokeLinejoin="miter" />
                            </svg>
                          </button>
                        )}
                      </>
                    ) : null
                  ) : (
                    <button
                      type="submit"
                      disabled={!valid || status === "loading"}
                      className="mt-6 w-full py-3.5 text-sm uppercase tracking-[0.25em] transition-transform active:scale-[0.99] disabled:opacity-40"
                      style={{ ...mono, background: INK, color: PAPER, borderRadius: 2 }}
                    >
                      {status === "loading" ? "Admitting…" : "I'm Here"}
                    </button>
                  )}
                </form>
              </div>
            </div>

            <div className={snapped ? "stub-rip" : ""} style={{ marginTop: "-1px" }}>
              <div
                className="relative ticket-shadow"
                style={{
                  background: PAPER,
                  borderRadius: "0 0 3px 3px",
                  WebkitMask: stubMask,
                  mask: stubMask,
                  WebkitMaskComposite: "source-in",
                  maskComposite: "intersect",
                }}
              >
                <div className="px-6 pb-3 pt-5">
                  <div className="flex h-8 items-stretch justify-center overflow-hidden" aria-hidden>
                    {barWidths.map((w, i) => (
                      <span key={i} style={{ width: `${w * 2}px`, background: i % 2 === 0 ? INK : "transparent" }} />
                    ))}
                  </div>
                  <div
                    className="mt-2 flex items-center justify-between text-[10px] uppercase"
                    style={{ ...mono, color: INK, letterSpacing: "0.16em" }}
                  >
                    <span>№ {ticketLabel}</span>
                    <span>Lyrist Records</span>
                  </div>
                </div>
              </div>
            </div>
            {ready && (
              <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
                <div className="ticket-sheen absolute inset-0" />
              </div>
            )}
            {snapped && (
              <div
                className="photo-flash pointer-events-none absolute inset-0 z-30"
                style={{ background: "#fff" }}
                aria-hidden
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
