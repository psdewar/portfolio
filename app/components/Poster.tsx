"use client";

import Image from "next/image";
import { Fragment, memo, useEffect, useRef, useState, type CSSProperties } from "react";
import { formatEventDate, formatEventDateShort, formatCombinedDates } from "../lib/dates";
import { getDoorLabel } from "../lib/shows";
import { DEFAULT_TAGLINE } from "../lib/poster-defaults";
import { POSTER_DIMS, type PosterFormat } from "../lib/poster-formats";

export interface PamphletShowItem {
  date: string;
  city: string;
  region: string;
  venue?: string | null;
  venueLabel?: string | null;
  dateLabel?: string | null;
  doorsOpen?: string | null;
  doorTime?: string | null;
  doorLabel?: string | null;
}

interface PosterProps {
  date?: string;
  city?: string;
  region?: string;
  doorTime?: string;
  doorLabel?: string | null;
  venue?: string | null;
  venueLabel?: string | null;
  address?: string | null;
  taglineSuffix?: string;
  tags?: string;
  doorsOpen?: string;
  showQr?: boolean;
  showDoors?: boolean;
  venueImg?: string;
  venueImgWidth?: number;
  venueImgOffsetY?: number;
  taglineAlign?: string;
  debug?: boolean;
  centerLogo?: boolean;
  pinTopRsvp?: boolean;
  // Hide the bottom details block (date/location/doors/QR) — used for private concerts.
  hideDetails?: boolean;
  format?: PosterFormat;
  scale?: number;
  // Pamphlet mode — when provided, renders a multi-show list instead of single-date details.
  shows?: PamphletShowItem[];
  // Single-show slug — when set, the QR points to that show's exact form (/rsvp/<slug>).
  slug?: string;
}

function Poster({
  date,
  city,
  region,
  doorTime,
  doorLabel,
  venue,
  venueLabel,
  address,
  taglineSuffix,
  tags = "",
  doorsOpen = "",
  showQr = false,
  showDoors = false,
  venueImg = "",
  venueImgWidth,
  venueImgOffsetY,
  taglineAlign = "left",
  debug = false,
  centerLogo = false,
  pinTopRsvp = true,
  hideDetails = false,
  format = "standard",
  scale = 1,
  shows,
  slug,
}: PosterProps) {
  const dims = POSTER_DIMS[format];
  const aspectRatio = `${dims.W} / ${dims.H}`;
  const venueImgSrc = venueImg.trim()
    ? venueImg.trim().startsWith("/")
      ? venueImg.trim()
      : `/${venueImg.trim()}`
    : "";

  // Debug: measure the tagline block (the minimum logo width) vs the logo.
  const taglineRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const qrLabelRef = useRef<HTMLDivElement>(null);
  const [taglineW, setTaglineW] = useState(0);
  const [logoW, setLogoW] = useState(0);
  const [qrLabelW, setQrLabelW] = useState(0);
  useEffect(() => {
    const el = qrLabelRef.current;
    if (!el) return;
    const measure = () => {
      const ls = parseFloat(getComputedStyle(el).letterSpacing) || 0;
      setQrLabelW(el.getBoundingClientRect().width - ls);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    if (!debug && !centerLogo) return;
    const measure = () => {
      if (taglineRef.current) setTaglineW(taglineRef.current.offsetWidth);
      if (logoRef.current) setLogoW(logoRef.current.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (taglineRef.current) ro.observe(taglineRef.current);
    if (logoRef.current) ro.observe(logoRef.current);
    return () => ro.disconnect();
  }, [debug, centerLogo, venueImgSrc, venueImgWidth, taglineSuffix]);
  const reached = logoW > 0 && taglineW > 0 && logoW >= taglineW - 1;
  const tagsList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);

  const computedLoc = (s: PamphletShowItem) =>
    `${s.venue ? `${s.venue}, ` : ""}${s.city}, ${s.region}`.trim();
  const resolveLoc = (s: PamphletShowItem) => s.venueLabel ?? computedLoc(s);
  const resolveDate = (s: PamphletShowItem) => s.dateLabel ?? formatEventDateShort(s.date);
  const resolveDoors = (s: PamphletShowItem) =>
    s.doorsOpen ?? (s.doorLabel || (s.doorTime ? `Doors open at ${s.doorTime}` : ""));
  const firstLoc = shows?.[0] ? resolveLoc(shows[0]) : "";
  const allSameLocation =
    !!shows && shows.length > 1 && !!firstLoc && shows.every((s) => resolveLoc(s) === firstLoc);
  const sharedLocation = allSameLocation ? firstLoc : "";
  const sameDoors =
    !showDoors || !shows || shows.every((s) => resolveDoors(s) === resolveDoors(shows[0]));
  const isCompact = !!sharedLocation && sameDoors;
  const topRowParts = [...tagsList, ...(sharedLocation ? [sharedLocation] : [])];
  const compactDateStr = isCompact ? formatCombinedDates(shows?.map((s) => s.date) ?? []) : "";
  const compactDoorsStr =
    isCompact && showDoors && shows?.[0] ? resolveDoors(shows[0]) || doorsOpen : "";

  return (
    <>
      <style jsx>{`
        .poster {
          width: 100%;
          max-height: 100%;
          position: relative;
          overflow: hidden;
          font-family: var(--font-parkinsans), sans-serif;
          background: #0a0a0a;
          container-type: inline-size;
        }
        @media (min-width: 768px) {
          .poster {
            width: auto;
            height: 100%;
            max-width: 100%;
            border-radius: 0;
          }
        }
        .photo-overlay {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            to right,
            rgba(10, 10, 10, 0.85) 0%,
            rgba(10, 10, 10, 0.65) 15%,
            rgba(10, 10, 10, 0.22) 45%,
            transparent 70%
          );
          z-index: 3;
        }
        .bottom-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          height: 40%;
          background: linear-gradient(
            to top,
            rgba(10, 10, 10, 0.9) 0%,
            rgba(10, 10, 10, 0.75) 25%,
            rgba(10, 10, 10, 0.4) 55%,
            transparent 100%
          );
          z-index: 4;
        }
        .poster-content {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: flex;
          flex-direction: column;
          padding: 5cqw 5.833cqw;
        }
        .lockup {
          display: flex;
          align-items: center;
          gap: 0.625cqw;
          margin-bottom: 0.833cqw;
        }
        .lockup-img {
          height: 4.583cqw;
          width: auto;
        }
        .lockup-records {
          font-family: var(--font-fira-sans), sans-serif;
          font-size: 3.333cqw;
          font-weight: 500;
          color: #ffffff;
          transform: translateY(-0.104cqw);
          will-change: transform;
        }
        .presents {
          font-family: var(--font-space-mono), monospace;
          font-size: 2.083cqw;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #e0b860;
          margin-bottom: 1.667cqw;
          margin-top: 1.667cqw;
        }
        .title-block {
          margin-bottom: auto;
        }
        .title-from {
          font-size: 5.417cqw;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #d4a553;
          line-height: 0.9;
        }
        .title-big {
          font-size: 11.76cqw;
          font-weight: 800;
          line-height: 0.9;
          letter-spacing: -0.01em;
          color: #f0ede6;
          text-transform: uppercase;
          margin-left: -0.417cqw;
        }
        .title-accent {
          width: 13.333cqw;
          height: 0.625cqw;
          background: linear-gradient(to right, #d4a553, #e0b860);
          margin: 1.25cqw 0 1.458cqw;
        }
        .the-concert {
          font-family: var(--font-space-mono), monospace;
          font-size: 2.083cqw;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #e0b860;
        }
        .tagline-block {
          width: fit-content;
        }
        .venue-img {
          display: block;
          height: 22.917cqw;
          width: auto;
          max-width: 45.833cqw;
          margin: 2.917cqw 0 2.083cqw;
          object-fit: contain;
        }
        .venue-wrap {
          position: relative;
          width: fit-content;
        }
        .venue-guide {
          position: absolute;
          top: 2.917cqw;
          bottom: 2.083cqw;
          left: 0;
          border-left: 2px solid;
          border-right: 2px solid;
          pointer-events: none;
        }
        .theme-topright {
          position: absolute;
          top: 5cqw;
          right: 5.833cqw;
          text-align: right;
          font-family: var(--font-space-mono), monospace;
          font-size: 2.083cqw;
          font-weight: 400;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #f0ede6;
          line-height: 1.6;
          transform: translateY(-0.521cqw);
          will-change: transform;
        }
        .details {
          margin-top: auto;
          width: 100%;
        }
        .bottom-left {
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 2.083cqw;
        }
        .detail-value {
          font-size: 2.917cqw;
          font-weight: 500;
          color: #f0ede6;
          letter-spacing: 0.02em;
        }
        .detail-value.date {
          font-size: 4.167cqw;
          font-weight: 700;
          color: #f0ede6;
        }
        .bottom-left.three-line .detail-value {
          font-size: 2.917cqw;
        }
        .bottom-left.three-line .detail-value.date {
          font-size: 4.583cqw;
        }
        .tags {
          font-family: var(--font-space-mono), monospace;
          font-size: 2.083cqw;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #e0b860;
          line-height: 1;
        }
        .tags-separator {
          color: #e0b860;
          opacity: 0.4;
          margin: 0 0.5em;
        }
        .bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: stretch;
        }
        .qr-section {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: space-between;
          gap: 1.667cqw;
        }
        .qr-code {
          width: 19.167cqw;
          height: 19.167cqw;
        }
        .qr-label {
          font-family: var(--font-space-mono), monospace;
          font-size: 2.083cqw;
          font-weight: 500;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #f0ede6;
          text-align: center;
          line-height: 1;
        }
        .pamphlet-top {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 3.333cqw;
          margin-bottom: 2.083cqw;
        }
        .pamphlet-rsvp {
          font-family: var(--font-space-mono), monospace;
          font-size: 2.083cqw;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #f0ede6;
          line-height: 1;
          white-space: nowrap;
        }
        .pamphlet-rows {
          position: relative;
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 3.75cqw;
        }
        .pamphlet-shows {
          position: relative;
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .pamphlet-rows .qr-section {
          justify-content: space-between;
          flex-shrink: 0;
        }
        .pamphlet-rows .qr-code {
          width: 19.167cqw;
          height: 19.167cqw;
        }
        .pamphlet-divider {
          height: 0.208cqw;
          background: rgba(212, 165, 83, 0.18);
          margin: 0.729cqw 0;
        }
        .pamphlet-show {
          display: flex;
          flex: 1;
          flex-direction: column;
          justify-content: center;
          gap: calc(1.667cqw * var(--pamphlet-scale, 1));
        }
        .pamphlet-debug-line {
          position: absolute;
          left: 0;
          right: 0;
          border-top: 1px dashed #ef4444;
          pointer-events: none;
          z-index: 10;
        }
        .pamphlet-debug-top {
          top: 0;
        }
        .pamphlet-debug-bottom {
          bottom: 0;
        }
        .pamphlet-debug-right {
          position: absolute;
          top: 0;
          bottom: 0;
          right: 0;
          border-left: 1px dashed #ef4444;
          pointer-events: none;
          z-index: 10;
        }
        .pamphlet-date {
          font-size: calc(4.167cqw * var(--pamphlet-scale, 1));
          font-weight: 700;
          color: #f0ede6;
          letter-spacing: 0;
          line-height: 1.1;
          flex-shrink: 0;
        }
        .pamphlet-detail {
          font-size: calc(2.917cqw * var(--pamphlet-scale, 1));
          font-weight: 500;
          color: #f0ede6;
          letter-spacing: 0.02em;
          line-height: 1.3;
        }
        /* Format-specific tweaks — keep in sync with pamphlet/route.ts */
        .poster[data-format="ig"] .title-from { font-size: 4.444cqw; }
        .poster[data-format="ig"] .title-big { font-size: 12.222cqw; }
        .poster[data-format="yt"] .title-from { font-size: 3.611cqw; }
        .poster[data-format="yt"] .title-big { font-size: 10cqw; }
        .poster[data-format="yt"] .venue-img { height: 16cqw; max-width: 32cqw; margin: 2cqw 0 1.5cqw; }
        .poster[data-format="yt"] .pamphlet-date { font-size: calc(3.2cqw * var(--pamphlet-scale, 1)); }
        .poster[data-format="yt"] .pamphlet-detail { font-size: calc(2.2cqw * var(--pamphlet-scale, 1)); }
        .poster[data-format="yt"] .qr-label { font-size: 1.8cqw; }
        .poster[data-format="eb"] .bottom-overlay,
        .poster[data-format="fb"] .bottom-overlay,
        .poster[data-format="fbe"] .bottom-overlay { display: none; }
        .poster[data-format="eb"] .details,
        .poster[data-format="fb"] .details,
        .poster[data-format="fbe"] .details { display: none; }
        .poster[data-format="eb"] .venue-img,
        .poster[data-format="fb"] .venue-img,
        .poster[data-format="fbe"] .venue-img { display: none; }
        .poster[data-format="eb"] .poster-content { padding: 3.333cqw 3.889cqw; }
        .poster[data-format="eb"] .lockup-img { height: 3.056cqw; }
        .poster[data-format="eb"] .lockup-records { font-size: 2.222cqw; transform: translateY(-0.174cqw); }
        .poster[data-format="eb"] .presents { font-size: 1.389cqw; margin: 1.111cqw 0; }
        .poster[data-format="eb"] .title-from { font-size: 3.611cqw; }
        .poster[data-format="eb"] .title-big { font-size: 10cqw; }
        .poster[data-format="eb"] .title-accent { width: 8.889cqw; height: 0.417cqw; margin: 0.833cqw 0 0.972cqw; }
        .poster[data-format="eb"] .the-concert { font-size: 1.389cqw; }
        .poster[data-format="eb"] .theme-topright { font-size: 1.25cqw; top: 3.333cqw; right: 3.889cqw; }
        .poster[data-format="fbe"] .title-big { font-size: 8.75cqw; }
        .poster[data-format="fb"] .title-from { font-size: 2.927cqw; }
        .poster[data-format="fb"] .title-big { font-size: 7.317cqw; }
        .poster[data-format="fb"] .title-accent { width: 7.317cqw; height: 0.366cqw; margin: 0.61cqw 0; }
        .poster[data-format="fb"] .the-concert { font-size: 1.22cqw; }
        .poster[data-format="fb"] .presents { font-size: 1.22cqw; margin: 0.732cqw 0; }
        .poster[data-format="fb"] .theme-topright { font-size: 1.22cqw; }
        .poster[data-format="fb"] .lockup { margin-top: auto; }
        .poster[data-format="fb"] .title-block { margin-bottom: 0; }
      `}</style>
      <div
        className="poster"
        data-format={format}
        style={{ aspectRatio, "--pamphlet-scale": scale } as CSSProperties}
      >
        <Image
          src="/Jan23OpenMicNight-08_Original.jpg"
          alt=""
          fill
          priority
          sizes="(max-width: 768px) 100vw, 50vw"
          style={{ objectFit: "cover", objectPosition: "center", zIndex: 1 }}
        />
        <div className="photo-overlay" />
        <div className="bottom-overlay" />
        <div className="poster-content">
          <div className="theme-topright">
            <div>a rap concert for all ages</div>
            <div>by microsoft engineer</div>
            <div>peyt spencer</div>
          </div>
          <div className="lockup">
            <img src="/lyrist-trademark-white.png" alt="Lyrist" className="lockup-img" />
            <span className="lockup-records">Records</span>
          </div>
          <div className="presents">presents</div>
          <div className="title-block">
            <div className="title-from">From The</div>
            <div className="title-big">Ground</div>
            <div className="title-big" style={{ marginBottom: 0 }}>
              Up
            </div>
            <div className="title-accent" />
            <div
              className="tagline-block"
              ref={taglineRef}
              style={{
                textAlign: taglineAlign as "justify" | "left",
                textAlignLast: taglineAlign as "justify" | "left",
              }}
            >
              {(taglineSuffix || DEFAULT_TAGLINE).split("\n").map((line, i) => (
                <div key={i} className="the-concert">{line}</div>
              ))}
            </div>
            {venueImgSrc && (
              <div
                className="venue-wrap"
                style={centerLogo && taglineW > 0 ? { width: taglineW, display: "flex", justifyContent: "center" } : undefined}
              >
                <img
                  ref={logoRef}
                  src={venueImgSrc}
                  alt=""
                  className="venue-img"
                  data-logo
                  style={{
                    ...(venueImgWidth
                      ? { width: `${(venueImgWidth * 100) / 480}cqw`, height: "auto", maxWidth: "none" }
                      : {}),
                    ...(venueImgOffsetY
                      ? { transform: `translateY(${(venueImgOffsetY * 100) / 480}cqw)` }
                      : {}),
                  }}
                />
                {debug && taglineW > 0 && (
                  <div
                    className="venue-guide"
                    style={{
                      width: taglineW,
                      borderColor: reached ? "#22c55e" : "#ef4444",
                    }}
                  />
                )}
              </div>
            )}
          </div>
          {hideDetails ? null : shows ? (
            <div className="details">
              {topRowParts.length > 0 && (
                <div className="pamphlet-top">
                  <div className="tags">{topRowParts.join(" · ")}</div>
                </div>
              )}
              <div className="pamphlet-rows">
                {debug && <div className="pamphlet-debug-line pamphlet-debug-top" />}
                <div className="pamphlet-shows">
                  {debug && <div className="pamphlet-debug-right" />}
                  {isCompact ? (
                    <div className="pamphlet-show">
                      <div className="pamphlet-date">{compactDateStr}</div>
                      {compactDoorsStr && (
                        <div className="pamphlet-detail">{compactDoorsStr}</div>
                      )}
                    </div>
                  ) : (
                    shows.map((s, i) => {
                      const dateStr = resolveDate(s);
                      const locStr = resolveLoc(s);
                      const doorsStr = showDoors ? resolveDoors(s) : "";
                      return (
                        <Fragment key={i}>
                          {i > 0 && <div className="pamphlet-divider" />}
                          <div className="pamphlet-show">
                            {dateStr && <div className="pamphlet-date">{dateStr}</div>}
                            {locStr && <div className="pamphlet-detail">{locStr}</div>}
                            {doorsStr && <div className="pamphlet-detail">{doorsStr}</div>}
                          </div>
                        </Fragment>
                      );
                    })
                  )}
                </div>
                <div
                  className="qr-section"
                  style={!pinTopRsvp ? { justifyContent: "flex-end" } : undefined}
                >
                  <div className="qr-label" ref={qrLabelRef}>
                    peytspencer.com/rsvp
                  </div>
                  {showQr && (
                    <img
                      src={`/api/qr?d=${encodeURIComponent("/rsvp")}`}
                      alt="QR Code"
                      className="qr-code"
                      style={qrLabelW ? { width: qrLabelW, height: qrLabelW } : undefined}
                    />
                  )}
                </div>
                {debug && <div className="pamphlet-debug-line pamphlet-debug-bottom" />}
              </div>
            </div>
          ) : date ? (
            <div className="details">
              <div className="bottom-row">
                <div className={`bottom-left${tagsList.length ? "" : " three-line"}`}>
                  {tagsList.length > 0 && <div className="tags">{tagsList.join(" · ")}</div>}
                  <div className="detail-value date">{formatEventDate(date)}</div>
                  <div className="detail-value">
                    {venueLabel ? (
                      venueLabel
                    ) : (
                      <>
                        {(venue || address) && `${venue || address}, `}
                        <span className="whitespace-nowrap">
                          {city}, {region}
                        </span>
                      </>
                    )}
                  </div>
                  <div className="detail-value">
                    {doorsOpen ||
                      getDoorLabel({ doorLabel: doorLabel ?? null, doorTime: doorTime ?? "" })}
                  </div>
                </div>
                {showQr && (
                  <div className="qr-section">
                    <div className="qr-label">peytspencer.com/rsvp</div>
                    <img
                      src={`/api/qr?d=${encodeURIComponent(slug ? `/rsvp/${slug}` : "/rsvp")}`}
                      alt="QR Code"
                      className="qr-code"
                    />
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}

export default memo(Poster);
