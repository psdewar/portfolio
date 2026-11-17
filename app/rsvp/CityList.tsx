"use client";

import { GraduationCapIcon, PlayIcon } from "@phosphor-icons/react";
import type { RsvpShow } from "../lib/rsvp-show";
import { formatEventDateShort } from "../lib/dates";
import { RSVP_INTRO } from "../lib/videos.config";

const stateSize = "max(1rem, calc(var(--city) * 0.6))";

const rowClass =
  "[--city:clamp(2rem,6vw,4rem)] split:[--city:clamp(2rem,10.5cqi,3rem)] flex w-full min-w-0 flex-col items-stretch gap-y-1 px-[clamp(1rem,4vw,1.5rem)] split:pl-12 split:pr-10 py-[clamp(0.75rem,2vw,1.25rem)] text-left";

const dateLineClass = "flex min-w-0 items-center justify-between gap-x-4";

const pill = (
  <span
    aria-hidden="true"
    className="shrink-0 -my-1.5 inline-flex items-center rounded-full ring-1 ring-inset ring-[color:var(--z-pillbd)] bg-[var(--z-pill)] px-4 py-1.5 font-semibold text-[color:var(--z-pillfg)]"
    style={{ fontSize: "clamp(1rem, 0.4vw + 0.9rem, 1.25rem)" }}
  >
    RSVP
  </span>
);

export default function CityList({
  shows,
  onSelect,
  onHover,
  noIntro,
  onReplayIntro,
}: {
  shows: RsvpShow[];
  onSelect: (show: RsvpShow) => void;
  onHover?: (show: RsvpShow) => void;
  noIntro?: boolean;
  onReplayIntro?: () => void;
}) {
  return (
    <div className="[container-type:inline-size]">
      {onReplayIntro && (
        <div
          className="replay-wrap [--city:clamp(2rem,6vw,4rem)] split:[--city:clamp(2rem,10.5cqi,3rem)]"
          style={noIntro ? undefined : { animation: "rsvp-fade 500ms 0ms both" }}
        >
          <button
            type="button"
            onClick={onReplayIntro}
            className="flex min-h-14 w-full items-center justify-center whitespace-nowrap gap-2 px-4 py-[clamp(0.5rem,1.5vw,0.875rem)] text-[color:var(--z-fg)] [@media(hover:hover)]:hover:bg-[var(--rsvp-row-hover)] focus-visible:bg-[var(--rsvp-row-hover)] active:!bg-[var(--rsvp-row-press)] active:text-[color:var(--rsvp-row-press-text)] focus-visible:outline-none transition-colors"
            style={{ fontSize: stateSize }}
          >
            <PlayIcon size="1em" weight="fill" aria-hidden="true" color="#D4A553" />
            <span className="inline-flex items-baseline gap-[0.4em]">
              <span className="font-semibold">How to RSVP</span>
              <span className="font-normal tabular-nums">
                {Math.floor(RSVP_INTRO.duration / 60)}:{String(RSVP_INTRO.duration % 60).padStart(2, "0")}
              </span>
            </span>
          </button>
        </div>
      )}
      <ul className="city-list">
        {shows.map((show, i) => {
          const isPrivate = show.visibility === "private";
          const isSchool = /school/i.test(show.venueLabel ?? show.venue ?? "");
          const [weekday, monthDay] = formatEventDateShort(show.date).split(", ");

          const label = (
            <span
              className="min-w-0 font-extrabold leading-[0.95] [font-size:var(--city)] [overflow-wrap:anywhere]"
            >
              <span data-city={show.slug} className="inline-block max-w-full" style={{ fontFamily: '"Parkinsans", sans-serif' }}>
                {show.city.slice(0, -1)}
                <span className="whitespace-nowrap">
                  {show.city.slice(-1)}
                  <span className="font-normal tracking-normal" style={{ fontSize: stateSize }}>
                    ,
                  </span>
                </span>
              </span>
              <span className="font-normal tracking-normal" style={{ fontSize: stateSize }}>
                {` ${show.region}`}
              </span>
            </span>
          );

          const meta = (
            <span className="shrink-0 tabular-nums">
              <span
                className="flex items-baseline gap-[0.3em] whitespace-nowrap"
                style={{ fontSize: stateSize }}
              >
                <span className="font-normal">{weekday},</span>
                <span className="font-medium">{monthDay}</span>
              </span>
            </span>
          );

          return (
            <li key={show.slug} className={isPrivate ? "relative overflow-hidden" : undefined} style={noIntro ? undefined : { animation: `rsvp-fade 500ms ${i * 70}ms both` }}>
              {isPrivate ? (
                <div
                  className={`${rowClass} text-[color:var(--z-fg)] cursor-default select-none`}
                >
                  {label}
                  <span className={dateLineClass}>{meta}</span>
                  {/* Corner ribbon: a 45deg gold band clipped by the li; last in DOM so it reads after city and date. */}
                  <span
                    className="ribbon pointer-events-none absolute flex rotate-45 items-center justify-center bg-[#D4A553] font-semibold leading-none text-[#262b3f] shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
                  >
                    {isSchool && <GraduationCapIcon size="1.1em" weight="fill" aria-hidden="true" className="ribbon-icon" />}
                    {isSchool ? "Students only" : "Private event"}
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onSelect(show)}
                  onMouseEnter={() => onHover?.(show)}
                  onFocus={() => onHover?.(show)}
                  className={`${rowClass} text-[color:var(--z-fg)] [@media(hover:hover)]:hover:bg-[var(--rsvp-row-hover)] focus-visible:bg-[var(--rsvp-row-hover)] active:!bg-[var(--rsvp-row-press)] active:text-[color:var(--rsvp-row-press-text)] focus-visible:outline-none transition-colors`}
                >
                  {label}
                  <span className={dateLineClass}>
                    {meta}
                    {pill}
                  </span>
                </button>
              )}
            </li>
          );
        })}
      </ul>
      <style jsx>{`
        .city-list {
          border-bottom: 1px solid rgba(212, 165, 83, 0.14);
        }
        .city-list > :global(li) + :global(li) {
          border-top: 1px solid rgba(212, 165, 83, 0.14);
        }
        .replay-wrap {
          border-bottom: 1px solid rgba(212, 165, 83, 0.14);
        }
        .ribbon {
          right: -32px;
          top: 30px;
          width: 150px;
          height: 26px;
          gap: 4px;
          font-size: 12.5px;
        }
        @media (min-width: 768px) {
          .ribbon {
            right: -31.5px;
            top: 44.5px;
            width: 180px;
            height: 28px;
            gap: 6px;
            font-size: 17px;
          }
        }
        @media (max-width: 359px) {
          .ribbon {
            right: -29.5px;
            top: 24.5px;
            width: 130px;
            height: 22px;
            gap: 4px;
            font-size: 11px;
          }
          .ribbon :global(.ribbon-icon) {
            display: none;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .city-list > :global(li),
          .replay-wrap {
            animation: none !important;
          }
        }
        @keyframes rsvp-fade {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
