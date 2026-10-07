"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import { useDocumentReady } from "../../hooks/useDocumentReady";
import { useScrollLock } from "../../hooks/useScrollLock";
import TicketStub, { TICKET_PAPER, TICKET_INK, TICKET_MUSTARD, STAMP_TEXTURE, ticketDisplay as display, ticketMono as mono } from "../../components/TicketStub";

const PAPER = TICKET_PAPER;
const INK = TICKET_INK;
const STAMP = "#c0392b";

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
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
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
  const prefetched = useRef(false);
  const restored = useRef(false);

  useEffect(() => {
    if (capture) return;
    const skip = new URLSearchParams(window.location.search).has("fresh");
    try {
      const raw = skip ? null : localStorage.getItem(`ticket:${slug}`);
      if (raw) {
        const t = JSON.parse(raw);
        if (t.name) setName(t.name);
        if (t.email) setEmail(t.email);
        if (t.phone) setPhone(t.phone);
        if (typeof t.ticketNo === "number") setTicketNo(t.ticketNo);
        if (t.rsvpd) setRsvpd(true);
        restored.current = true;
        setStatus("done");
        setRevealButton(true);
        return;
      }
    } catch {}
    const e = localStorage.getItem("attendeeEmail");
    if (e) setEmail(e);
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.name) setName(data.name);
      });
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

  useScrollLock();

  const valid = !!name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const checkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status === "loading") return;
    setStatus("loading");
    setError("");
    if (preview) {
      localStorage.setItem(
        `ticket:${slug}`,
        JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim(), ticketNo, rsvpd }),
      );
      setStatus("done");
      return;
    }
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email: email.trim(), name: name.trim(), phone: phone.trim(), website }),
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
      localStorage.setItem(
        `ticket:${slug}`,
        JSON.stringify({ name: name.trim(), email: emailLower, phone: phone.trim(), ticketNo: no, rsvpd: !!data.rsvpd }),
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

  const saveTicket = () => {
    if (!ticketBlob) return;
    const file = new File([ticketBlob.blob], "ground-up-ticket.png", { type: "image/png" });
    const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
    if (coarse && navigator.canShare?.({ files: [file] })) {
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

  useEffect(() => {
    if (status !== "done" || capture || prefetched.current) return;
    prefetched.current = true;
    prefetchTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, capture]);

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
        background: `radial-gradient(130% 85% at 50% -15%, #e3bd72, ${TICKET_MUSTARD})`,
        touchAction: keyboardOpen ? "pan-y" : "none",
        overscrollBehavior: "none",
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
          <TicketStub
            ticketRef={ticketRef}
            city={city}
            region={region}
            date={date}
            venueLabel={venueLabel}
            ticketNo={ticketNo}
            rsvpd={rsvpd}
            ready={ready}
            snapped={snapped}
          >
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
                  enterKeyHint="next"
                  placeholder="your email"
                  value={email}
                  disabled={status === "done"}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-3 w-full bg-transparent pb-1.5 text-left text-base outline-none placeholder:opacity-40"
                  style={fieldStyle}
                />
                {!(capture && !phone.trim()) && (
                  <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    enterKeyHint="done"
                    placeholder="your phone"
                    value={phone}
                    disabled={status === "done"}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-3 w-full bg-transparent pb-1.5 text-left text-base outline-none placeholder:opacity-40"
                    style={fieldStyle}
                  />
                )}
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
                        background: ticketBlob && !saveAttempted ? TICKET_MUSTARD : "#cbced5",
                        color: ticketBlob && !saveAttempted ? INK : "#7e838f",
                        border: `2px solid ${ticketBlob && !saveAttempted ? INK : "#b1b6bf"}`,
                        borderRadius: 2,
                      }}
                    >
                      {ticketBlob ? "Keep Your Ticket" : "Preparing…"}
                    </button>
                    {saveAttempted && (
                      <div className="-mx-6 -mb-5 mt-4 flex">
                        {[
                          {
                            path: "/support",
                            label: "Fund the Tour",
                            src: "/images/covers/exhibit-psd-live-cover.jpg",
                            position: "center 30%",
                          },
                          {
                            path: "/shop",
                            label: "Patience Tee",
                            src: "/images/merch/patience-navy.jpeg",
                            position: "center 43%",
                          },
                        ].map((cta) => (
                          <Link key={cta.path} href={cta.path} className="relative block w-1/2 min-w-0">
                            <Image
                              src={cta.src}
                              alt={cta.label}
                              width={300}
                              height={200}
                              className="h-24 w-full object-cover"
                              style={{ objectPosition: cta.position }}
                              unoptimized
                            />
                            <span
                              className="absolute inset-x-0 bottom-0 pb-1.5 pt-4 text-center text-[9px] uppercase tracking-[0.18em]"
                              style={{
                                ...mono,
                                color: PAPER,
                                background: `linear-gradient(180deg, transparent, ${INK}cc)`,
                              }}
                            >
                              {cta.label}
                            </span>
                          </Link>
                        ))}
                      </div>
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
          </TicketStub>
        </div>
      </div>
    </div>
  );
}
