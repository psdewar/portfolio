"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CaretDownIcon } from "@phosphor-icons/react";
import { formatMonthDay, isDatePast } from "../lib/dates";

export interface TourStop {
  location: string;
  date: string;
  url?: string;
}

export default function TourItinerary({ stops }: { stops: TourStop[] }) {
  const [expanded, setExpanded] = useState(false);
  const upcoming = stops
    .filter((s) => !isDatePast(s.date))
    .sort((a, b) => a.date.localeCompare(b.date));
  const past = stops
    .filter((s) => isDatePast(s.date))
    .sort((a, b) => b.date.localeCompare(a.date));
  const visible = expanded ? [...upcoming, ...past] : upcoming;
  const hasMore = past.length > 0;

  return (
    <div className="rounded-xl py-2 px-5 bg-white dark:bg-[#080810] border border-neutral-200 dark:border-[rgba(212,165,83,0.15)]">
      {visible.map((stop, i) => {
        const parts = stop.location.split(", ");
        const city = parts[0];
        const region = parts.slice(1).join(", ");
        const isPast = isDatePast(stop.date);
        const linkable = !isPast && !!stop.url;
        const className =
          "flex items-center gap-3 px-5 -mx-5 py-2 min-h-[44px] transition-colors " +
          (linkable ? "hover:bg-[rgba(212,165,83,0.06)] cursor-pointer group" : "");

        const content = (
          <>
            <span
              className={`font-mono text-base leading-tight truncate flex-1 ${
                isPast
                  ? "text-neutral-500 dark:text-white/40"
                  : "text-neutral-700 dark:text-white/70"
              }`}
            >
              {city}
              {region && (
                <span className={isPast ? "text-[rgba(212,165,83,0.55)]" : "text-[#d4a553]"}>
                  , {region}
                </span>
              )}
            </span>
            <span
              className={`font-mono text-sm shrink-0 tabular-nums ${
                isPast ? "text-[rgba(212,165,83,0.55)]" : "text-[#d4a553]"
              }`}
            >
              {formatMonthDay(stop.date)}
            </span>
            {linkable && (
              <span className="shrink-0 font-mono text-xs uppercase tracking-wider rounded px-1.5 py-0.5 bg-[#d4a553] text-neutral-950 inline-flex items-center gap-1 transition-transform group-hover:translate-x-0.5">
                RSVP
                <ArrowRightIcon size={12} weight="bold" />
              </span>
            )}
          </>
        );

        return linkable ? (
          <Link key={i} href={stop.url!} className={className}>
            {content}
          </Link>
        ) : (
          <div key={i} className={className}>
            {content}
          </div>
        );
      })}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 mt-1 px-5 -mx-5 py-2 min-h-[44px] w-full text-left font-mono text-sm text-[rgba(212,165,83,0.6)] hover:text-[#d4a553] transition-colors"
        >
          {expanded ? "Hide past" : `${past.length} past`}
          <CaretDownIcon
            size={12}
            weight="bold"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}
