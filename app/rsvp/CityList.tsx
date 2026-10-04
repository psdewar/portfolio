"use client";

import { LockSimpleIcon } from "@phosphor-icons/react";
import type { RsvpShow } from "../lib/rsvp-show";
import { formatEventDateShort } from "../lib/dates";

const stateSize = "max(1rem, calc(var(--city) * 0.6))";

const rowClass =
  "[--city:clamp(2rem,6vw,4rem)] split:[--city:clamp(2rem,10.5cqi,3rem)] flex w-full min-w-0 flex-col items-stretch gap-y-1 px-[clamp(1rem,4vw,1.5rem)] split:pl-0 split:pr-[clamp(1.5rem,3vw,3rem)] py-[clamp(0.75rem,2vw,1.25rem)] text-left";

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
}: {
  shows: RsvpShow[];
  onSelect: (show: RsvpShow) => void;
  onHover?: (show: RsvpShow) => void;
  noIntro?: boolean;
}) {
  return (
    <div className="[container-type:inline-size]">
      <ul className="city-list">
        {shows.map((show, i) => {
          const isPrivate = show.visibility === "private";
          const [weekday, monthDay] = formatEventDateShort(show.date).split(", ");

          const label = (
            <span
              className="min-w-0 break-words font-extrabold leading-[0.95] [font-size:var(--city)]"
            >
              <span data-city={show.slug} className="inline-block" style={{ fontFamily: '"Parkinsans", sans-serif' }}>{show.city}</span>
              <span
                className="font-normal tracking-normal"
                style={{ fontSize: stateSize }}
              >
                {`, ${show.region}`}
              </span>
            </span>
          );

          const meta = (
            <span className={`shrink-0 tabular-nums ${isPrivate ? "text-[color:var(--z-fg3)]" : ""}`}>
              <span
                className="flex items-baseline gap-[0.3em] whitespace-nowrap"
                style={{ fontSize: stateSize }}
              >
                <span className="font-normal">{weekday},</span>
                <span className="font-medium">{monthDay}</span>
                {isPrivate && (
                  <LockSimpleIcon size="1em" weight="bold" aria-label="Private" className="self-center" />
                )}
              </span>
            </span>
          );

          return (
            <li key={show.slug} style={noIntro ? undefined : { animation: `rsvp-fade 500ms ${i * 70}ms both` }}>
              {isPrivate ? (
                <div
                  className={`${rowClass} text-[color:var(--z-fg)] cursor-default select-none`}
                >
                  {label}
                  <span className={dateLineClass}>{meta}</span>
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
        @media (prefers-reduced-motion: reduce) {
          .city-list > :global(li) {
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
