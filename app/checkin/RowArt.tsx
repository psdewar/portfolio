"use client";

import { useId, type ReactNode } from "react";
import { TICKET_INK as INK, TICKET_MUSTARD as MUSTARD, TICKET_PAPER as PAPER } from "../components/TicketStub";
import { InstagramGlyph } from "./BrandGlyphs";


function Art({ children }: { children: ReactNode }) {
  return (
    <svg className="rowart" viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function RecordArt() {
  return (
    <Art>
      <circle cx="20" cy="21.2" r="17" fill={INK} opacity=".18" />
      <circle cx="20" cy="20" r="17" fill={INK} />
      <circle cx="20" cy="20" r="14" fill="none" stroke={PAPER} strokeWidth=".5" opacity=".16" />
      <circle cx="20" cy="20" r="11.5" fill="none" stroke={PAPER} strokeWidth=".5" opacity=".16" />
      <circle cx="20" cy="20" r="9.2" fill="none" stroke={PAPER} strokeWidth=".5" opacity=".16" />
      <path d="M9.5 12A12.5 12.5 0 0 1 16 7.4" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".4" />
      <circle cx="20" cy="20" r="6.2" fill={MUSTARD} />
      <circle cx="20" cy="20" r="1.3" fill={PAPER} />
    </Art>
  );
}

export function PinArt() {
  const id = useId().replace(/:/g, "");
  const body =
    "M20 3C12.3 3 7 8.7 7 15.5C7 24 20 37 20 37C20 37 33 24 33 15.5C33 8.7 27.7 3 20 3Z";
  return (
    <Art>
      <defs>
        <clipPath id={`${id}-r`}>
          <rect x="20" y="0" width="20" height="40" />
        </clipPath>
      </defs>
      <ellipse cx="20" cy="37" rx="7" ry="1.6" fill={INK} opacity=".18" />
      <path d={body} fill={MUSTARD} />
      <path d={body} fill="#a9782c" clipPath={`url(#${id}-r)`} opacity=".55" />
      <circle cx="20" cy="15.5" r="5.5" fill={INK} />
      <path d="M11.5 11.5A9.5 9.5 0 0 1 17 6.4" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" opacity=".7" />
    </Art>
  );
}

export function StubArt() {
  const body =
    "M9 2H31Q33 2 33 4V25.5A2.5 2.5 0 0 0 33 30.5V36Q33 38 31 38H9Q7 38 7 36V30.5A2.5 2.5 0 0 0 7 25.5V4Q7 2 9 2Z";
  const star = "M5 0L6.4 3.6L10 5L6.4 6.4L5 10L3.6 6.4L0 5L3.6 3.6Z";
  return (
    <Art>
      <path d={body} transform="translate(0 1.5)" fill={INK} opacity=".18" />
      <path d={body} fill={PAPER} stroke={INK} strokeOpacity=".2" strokeWidth=".75" />
      <path d={star} transform="translate(11.5 4.5) scale(.3)" fill={MUSTARD} />
      <path d={star} transform="translate(25.5 4.5) scale(.3)" fill={MUSTARD} />
      <rect x="16" y="5.7" width="8" height="1" rx=".5" fill={INK} />
      <rect x="12" y="10" width="16" height="2.6" rx=".6" fill={INK} />
      <rect x="10" y="13.6" width="20" height="2.6" rx=".6" fill={INK} />
      <rect x="10" y="19" width="8" height=".6" fill={INK} opacity=".33" />
      <rect x="22" y="19" width="8" height=".6" fill={INK} opacity=".33" />
      <path d={star} transform="translate(18.5 17.8) scale(.3)" fill={MUSTARD} />
      <rect x="12" y="22" width="16" height="2.2" rx=".6" fill={INK} />
      <path d="M10 28H30" stroke={INK} strokeOpacity=".35" strokeWidth=".8" strokeDasharray="1.6 1.6" />
      <rect x="11" y="31.5" width="1" height="4" fill={INK} />
      <rect x="13" y="31.5" width="2" height="4" fill={INK} />
      <rect x="16" y="31.5" width="1" height="4" fill={INK} />
      <rect x="18" y="31.5" width="1" height="4" fill={INK} />
      <rect x="20" y="31.5" width="2" height="4" fill={INK} />
      <rect x="23" y="31.5" width="1" height="4" fill={INK} />
      <rect x="25" y="31.5" width="2" height="4" fill={INK} />
      <rect x="28" y="31.5" width="1" height="4" fill={INK} />
    </Art>
  );
}

export function PhotoArt() {
  const id = useId().replace(/:/g, "");
  return (
    <Art>
      <defs>
        <clipPath id={`${id}-p`}>
          <rect x="6" y="6" width="28" height="23" />
        </clipPath>
      </defs>
      <g transform="rotate(-6 20 20)">
        <rect x="3" y="4.5" width="34" height="34" rx="2" fill={INK} opacity=".18" />
        <rect x="3" y="3" width="34" height="34" rx="2" fill="#fbfbfa" stroke={INK} strokeOpacity=".2" strokeWidth=".75" />
        <rect x="6" y="6" width="28" height="23" fill="#1d2136" />
        <g clipPath={`url(#${id}-p)`}>
          <path d="M12 6L3 29H19Z" fill={MUSTARD} opacity=".45" />
          <path d="M28 6L21 29H37Z" fill="#f2f7ff" opacity=".3" />
          <ellipse cx="20" cy="29" rx="11" ry="2.2" fill={MUSTARD} opacity=".5" />
          <circle cx="20" cy="19.5" r="2.4" fill="#0e1020" />
          <path d="M17.6 22.5H22.4V29H17.6Z" fill="#0e1020" />
        </g>
        <circle cx="12" cy="7.6" r="1.2" fill="#fff1b8" />
        <circle cx="28" cy="7.6" r="1.2" fill="#fff1b8" />
      </g>
    </Art>
  );
}

export function InstagramArt() {
  return (
    <Art>
      <rect x="2.5" y="2.5" width="35" height="35" rx="9" fill={PAPER} />
      <InstagramGlyph x={2} y={2} size={36} />
    </Art>
  );
}
