"use client";

import { useEffect, useRef } from "react";
export { STAMP_TEXTURE } from "../rsvp/ZoneGrain";

export const TICKET_PAPER = "#eef0f3";
export const TICKET_INK = "#262b3f";
export const TICKET_MUSTARD = "#d4a553";
const SHINE_GOLD =
  "linear-gradient(150deg, #b07f33 0%, #e8c878 26%, #f8ecb6 48%, #d4a553 64%, #a8772f 100%)";

export const ticketDisplay = { fontFamily: "var(--font-parkinsans), sans-serif" } as const;
export const ticketMono = { fontFamily: "var(--font-space-mono), monospace" } as const;

function Star({ size = "0.66em" }: { size?: string }) {
  return (
    <svg viewBox="0 0 10 10" fill={TICKET_MUSTARD} aria-hidden style={{ width: size, height: size, flexShrink: 0 }}>
      <path d="M5 0L6.4 3.6L10 5L6.4 6.4L5 10L3.6 6.4L0 5L3.6 3.6Z" />
    </svg>
  );
}

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

const dashRow = (y: string) => `radial-gradient(3px 1.5px at 6px ${y}, #0000 92%, #000) 0 0/12px 100% repeat-x`;
const bodyMask =
  "radial-gradient(13px at left bottom, #0000 98%, #000)," +
  "radial-gradient(13px at right bottom, #0000 98%, #000)," +
  dashRow("100%");
const stubMask =
  "radial-gradient(13px at left top, #0000 98%, #000)," +
  "radial-gradient(13px at right top, #0000 98%, #000)," +
  dashRow("0%");

interface Props {
  city: string;
  region?: string | null;
  date: string;
  venueLabel: string | null;
  ticketNo?: number | null;
  rsvpd?: boolean;
  ready?: boolean;
  snapped?: boolean;
  ticketRef?: React.Ref<HTMLDivElement>;
  children?: React.ReactNode;
}

export default function TicketStub({
  city,
  region,
  date,
  venueLabel,
  ticketNo = null,
  rsvpd = false,
  ready = true,
  snapped = false,
  ticketRef,
  children,
}: Props) {
  const cityRef = useRef<HTMLParagraphElement>(null);

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

  const venueName = venueLabel ? venueLabel.split(",")[0].trim() : null;
  const d = new Date(date + "T12:00:00");
  const ticketDate = d
    .toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
    .toUpperCase();
  const serial = date.replace(/-/g, "");
  const seq = ticketNo != null ? String(ticketNo).padStart(4, "0") : "----";
  const ticketLabel = `${serial}${seq}`;
  const barWidths = seededBarWidths(ticketLabel);

  return (
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
              ...ticketMono,
              position: "absolute",
              width: 118,
              left: -29,
              top: 19,
              padding: "3px 0",
              textAlign: "center",
              background: SHINE_GOLD,
              color: TICKET_INK,
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
          background: TICKET_PAPER,
          borderRadius: "3px 3px 0 0",
          WebkitMask: bodyMask,
          mask: bodyMask,
          WebkitMaskComposite: "source-in",
          maskComposite: "intersect",
        }}
      >
        <div className="px-6 pb-5 pt-7">
          <div className="text-center" style={{ color: TICKET_INK }}>
            <div
              className="flex items-center justify-center gap-3 text-[10px] uppercase"
              style={{ ...ticketMono, letterSpacing: "0.35em" }}
            >
              <Star />
              <span>Admit One</span>
              <Star />
            </div>

            <h1
              className="mt-3 whitespace-nowrap font-extrabold uppercase leading-[0.86]"
              style={{ ...ticketDisplay, fontSize: "2.5rem", color: TICKET_INK }}
            >
              From The
              <br />
              Ground Up
            </h1>

            <span className="mt-4 flex items-center gap-2" aria-hidden>
              <span className="h-px flex-1" style={{ background: `${TICKET_INK}55` }} />
              <Star />
              <span className="h-px flex-1" style={{ background: `${TICKET_INK}55` }} />
            </span>

            <p
              ref={cityRef}
              className="mt-2 whitespace-nowrap font-extrabold uppercase leading-none"
              style={{ ...ticketDisplay, fontSize: "2.5rem", color: TICKET_INK }}
            >
              {region ? `${city}, ${region}` : city}
            </p>
            <p className="mt-2 text-[10px] uppercase" style={{ ...ticketMono, letterSpacing: "0.18em" }}>
              {ticketDate}
            </p>
            {venueName && (
              <p
                className="mt-2 text-[10px] uppercase"
                style={{ ...ticketMono, letterSpacing: "0.2em", color: `${TICKET_INK}99` }}
              >
                {venueName}
              </p>
            )}
          </div>

          {children}
        </div>
      </div>

      <div className={snapped ? "stub-rip" : ""} style={{ marginTop: "-1px" }}>
        <div
          className="relative ticket-shadow"
          style={{
            background: TICKET_PAPER,
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
                <span key={i} style={{ width: `${w * 2}px`, background: i % 2 === 0 ? TICKET_INK : "transparent" }} />
              ))}
            </div>
            <div
              className="mt-2 flex items-center justify-between text-[10px] uppercase"
              style={{ ...ticketMono, color: TICKET_INK, letterSpacing: "0.16em" }}
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
  );
}
