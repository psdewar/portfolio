"use client";

import Image from "next/image";
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
}: PosterProps) {
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
            <div className="the-concert">my path of growth</div>
            <div className="the-concert">and the principles</div>
            <div className="the-concert">
              that connect us{taglineSuffix ? ` ${taglineSuffix.split("\n")[0]}` : ""}
            </div>
            {taglineSuffix
              ?.split("\n")
              .slice(1)
              .map((line, i) => (
                <div key={i} className="the-concert">
                  {line}
                </div>
              ))}
          </div>
          {date && (
            <div className="details">
              <div className="bottom-left">
                <div className="tags">Free Admission</div>
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
                  {getDoorLabel({ doorLabel: doorLabel ?? null, doorTime: doorTime ?? "" })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
