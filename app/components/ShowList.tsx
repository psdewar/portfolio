"use client";

import Link from "next/link";
import { ArrowRightIcon, LockSimpleIcon } from "@phosphor-icons/react";
import type { Show } from "../lib/shows";
import { parseLocalDate } from "../lib/dates";

function formatDay(iso: string): string {
  return String(parseLocalDate(iso).getDate()).padStart(2, "0");
}

function formatMonthAbbr(iso: string): string {
  return parseLocalDate(iso)
    .toLocaleString("en-US", { month: "short" })
    .toUpperCase();
}

function formatWeekdayAbbr(iso: string): string {
  return parseLocalDate(iso)
    .toLocaleString("en-US", { weekday: "short" })
    .toUpperCase();
}

export default function ShowList({
  shows,
  onSelect,
}: {
  shows: Show[];
  onSelect?: (show: Show) => void;
}) {
  return (
    <>
      <ul className="show-list">
        {shows.map((show, i) => {
          const isPrivate = show.visibility === "private";
          const venueName = show.venue || show.address || "";
          const cityRegion = `${show.city}, ${show.region}`;
          const meta = isPrivate
            ? "By invitation"
            : show.doorLabel || `Doors open at ${show.doorTime}`;

          const inner = (
            <>
              <div
                aria-hidden
                className="shrink-0 flex flex-col items-center leading-none select-none"
              >
                <span
                  className="tracking-[0.18em] mb-1"
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: "clamp(0.875rem, 0.4vw + 0.75rem, 1.125rem)",
                    color: isPrivate ? "#9ca3af" : "#d4a553",
                  }}
                >
                  {formatWeekdayAbbr(show.date)}
                </span>
                <span
                  className="font-semibold tabular-nums text-neutral-900 dark:text-[#f0ede6]"
                  style={{
                    fontFamily: '"Parkinsans", sans-serif',
                    fontSize: "clamp(1.5rem, 1vw + 1rem, 2.25rem)",
                    letterSpacing: "0",
                    lineHeight: 0.95,
                  }}
                >
                  {formatDay(show.date)}
                </span>
                <span
                  className="tracking-[0.18em] mt-1"
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: "clamp(0.875rem, 0.4vw + 0.75rem, 1.125rem)",
                    color: isPrivate ? "#9ca3af" : "#d4a553",
                  }}
                >
                  {formatMonthAbbr(show.date)}
                </span>
              </div>

              <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div
                  className={`font-semibold leading-tight ${
                    isPrivate
                      ? "text-neutral-400 dark:text-neutral-500"
                      : "text-neutral-900 dark:text-[#f0ede6]"
                  }`}
                  style={{
                    fontFamily: '"Parkinsans", sans-serif',
                    fontSize: "clamp(1rem, 0.6vw + 0.8rem, 1.5rem)",
                  }}
                >
                  {show.venueLabel ? (
                    <span style={{ overflowWrap: "anywhere" }}>{show.venueLabel}</span>
                  ) : (
                    <>
                      <span style={{ whiteSpace: "nowrap" }}>
                        {venueName ? `${venueName},` : ""}
                      </span>{" "}
                      <span style={{ whiteSpace: "nowrap" }}>{cityRegion}</span>
                    </>
                  )}
                </div>
                <div
                  className={`uppercase tracking-[0.14em] ${
                    isPrivate
                      ? "text-neutral-400 dark:text-neutral-600"
                      : "text-neutral-500 dark:text-neutral-400"
                  }`}
                  style={{
                    fontFamily: '"Space Mono", monospace',
                    fontSize: "clamp(0.875rem, 0.4vw + 0.75rem, 1.125rem)",
                  }}
                >
                  {meta}
                </div>
              </div>

              <div
                className="shrink-0 flex items-center justify-end"
                style={{ width: "1.75rem" }}
                aria-hidden
              >
                {isPrivate ? (
                  <LockSimpleIcon size={22} weight="duotone" style={{ color: "#9ca3af" }} />
                ) : (
                  <ArrowRightIcon
                    size={22}
                    weight="bold"
                    className="transition-transform duration-200 group-hover:translate-x-1"
                    style={{ color: "#d4a553" }}
                  />
                )}
              </div>
            </>
          );

          const rowClass =
            "w-full flex items-center gap-4 md:gap-6 py-3.5 md:py-4 px-4 sm:px-6 lg:px-8 text-left transition-colors duration-200";

          let row: React.ReactNode;
          if (isPrivate) {
            row = <div className={`${rowClass} cursor-default opacity-70`}>{inner}</div>;
          } else if (onSelect) {
            row = (
              <button
                type="button"
                onClick={() => onSelect(show)}
                className={`${rowClass} group hover:bg-[rgba(212,165,83,0.05)] active:bg-[rgba(212,165,83,0.10)] focus:outline-none focus-visible:bg-[rgba(212,165,83,0.08)]`}
              >
                {inner}
              </button>
            );
          } else {
            row = (
              <Link
                href={`/rsvp/${show.slug}`}
                className={`${rowClass} group hover:bg-[rgba(212,165,83,0.05)] active:bg-[rgba(212,165,83,0.10)] focus:outline-none focus-visible:bg-[rgba(212,165,83,0.08)]`}
              >
                {inner}
              </Link>
            );
          }

          return (
            <li key={show.slug} style={{ animation: `rsvp-fade 500ms ${i * 70}ms both` }}>
              {row}
            </li>
          );
        })}
      </ul>

      <style jsx>{`
        .show-list > :global(li) + :global(li) {
          border-top: 1px solid rgba(212, 165, 83, 0.14);
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
    </>
  );
}
