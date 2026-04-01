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

const INITIAL_COUNT = 3;

export default function TourItinerary({ stops }: { stops: TourStop[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? stops : stops.slice(0, INITIAL_COUNT);
  const hasMore = stops.length > INITIAL_COUNT;

  return (
    <div className="rounded-xl py-3 px-5 bg-white dark:bg-[#080810] border border-neutral-200 dark:border-amber-400/15">
      {visible.map((stop, i) => {
        const parts = stop.location.split(", ");
        const city = parts[0];
        const region = parts.slice(1).join(", ");
        const past = isDatePast(stop.date);
        const linkable = !past && !!stop.url;
        const className =
          "flex items-center gap-3 px-5 -mx-5 py-1.5 transition-colors " +
          (linkable ? "hover:bg-amber-500/5 cursor-pointer group" : "");

        const content = (
          <>
            <span className="font-mono text-base leading-tight truncate flex-1 text-neutral-700 dark:text-white/70">
              {city}
              {region && (
                <span className="text-amber-700/50 dark:text-amber-400/45">, {region}</span>
              )}
            </span>
            <span
              className={
                "font-mono text-sm shrink-0 tabular-nums " +
                (past
                  ? "text-amber-700/30 dark:text-amber-400/30"
                  : "text-amber-700/75 dark:text-amber-400/75")
              }
            >
              {formatMonthDay(stop.date)}
            </span>
            {linkable && (
              <span className="shrink-0 font-mono text-xs uppercase tracking-wider rounded px-1.5 py-0.5 bg-amber-700/60 dark:bg-amber-400/50 text-white dark:text-neutral-950 inline-flex items-center gap-1 transition-transform group-hover:translate-x-0.5">
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
          className="flex items-center gap-1.5 mt-1 px-5 -mx-5 py-1.5 w-full text-left font-mono text-sm text-amber-700/60 dark:text-amber-400/40 hover:text-amber-700 dark:hover:text-amber-400/70 transition-colors"
        >
          {expanded ? "Less" : `${stops.length - INITIAL_COUNT} more`}
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
