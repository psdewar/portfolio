"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { formatEventDate } from "../lib/dates";
import { getDoorLabel } from "../lib/shows";

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
  venueImg?: string;
  venueImgWidth?: number;
  taglineAlign?: string;
  debug?: boolean;
}

export default function Poster({
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
  venueImg = "",
  venueImgWidth,
  taglineAlign = "justify",
  debug = false,
}: PosterProps) {
  const venueImgSrc = venueImg.trim()
    ? venueImg.trim().startsWith("/")
      ? venueImg.trim()
      : `/${venueImg.trim()}`
    : "";

  // Debug: measure the tagline block (the minimum logo width) vs the logo.
  const taglineRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<HTMLImageElement>(null);
  const [taglineW, setTaglineW] = useState(0);
  const [logoW, setLogoW] = useState(0);
  useEffect(() => {
    if (!debug) return;
    const measure = () => {
      if (taglineRef.current) setTaglineW(taglineRef.current.offsetWidth);
      if (logoRef.current) setLogoW(logoRef.current.offsetWidth);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (taglineRef.current) ro.observe(taglineRef.current);
    if (logoRef.current) ro.observe(logoRef.current);
    return () => ro.disconnect();
  }, [debug, venueImgSrc, venueImgWidth, taglineSuffix]);
  const reached = logoW > 0 && taglineW > 0 && logoW >= taglineW - 1;
  const tagsList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
  return (
    <>
      <style jsx>{`
        .poster {
          width: 100%;
          aspect-ratio: 480 / 720;
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
            aspect-ratio: 480 / 720;
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
          align-items: flex-start;
        }
        .qr-section {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
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
      `}</style>
      <div className="poster">
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
              <div className="the-concert">my path of growth</div>
              <div className="the-concert">and the principles</div>
              <div className="the-concert">
                that connect us
                {venueImgSrc ? " at" : taglineSuffix ? ` ${taglineSuffix.split("\n")[0]}` : ""}
              </div>
              {!venueImgSrc &&
                taglineSuffix
                  ?.split("\n")
                  .slice(1)
                  .map((line, i) => (
                    <div key={i} className="the-concert">
                      {line}
                    </div>
                  ))}
            </div>
            {venueImgSrc && (
              <div className="venue-wrap">
                <img
                  ref={logoRef}
                  src={venueImgSrc}
                  alt=""
                  className="venue-img"
                  style={
                    venueImgWidth
                      ? {
                          width: `${(venueImgWidth * 100) / 480}cqw`,
                          height: "auto",
                          maxWidth: "none",
                        }
                      : undefined
                  }
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
          {date && (
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
                      src="https://assets.peytspencer.com/images/rsvp-qr-s10.png"
                      alt="QR Code"
                      className="qr-code"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
