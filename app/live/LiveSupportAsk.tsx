"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { PendingRsvpProvider, ShowRow } from "../components/ShowRow";
import type { TimelineEvent } from "../data/timeline";
import { LIVE_STRIP_ROW_PX } from "./useLiveLayout";

const STRIP_ROW_LG_PX = 72;
const STRIP_ROW_MAX_PX = 120;

export interface LiveSupportAskCore {
  upcomingShows: TimelineEvent[];
  pastShows?: TimelineEvent[];
  onOpenSupport: () => void;
  place?: string | null;
}

export function LiveSupportAsk({
  upcomingShows,
  pastShows = [],
  place,
  tone = "auto",
  variant = "sheet",
  stripColumns = 2,
  stripRowPx = null,
  onFirstScreenMeasured,
  children,
}: LiveSupportAskCore & {
  tone?: "auto" | "dark";
  variant?: "sheet" | "strip" | "side";
  stripColumns?: number;
  stripRowPx?: number | null;
  onFirstScreenMeasured?: (px: number) => void;
  children?: ReactNode;
}) {
  const firstScreenRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!onFirstScreenMeasured) return;
    const el = firstScreenRef.current;
    if (!el) return;
    const update = () => onFirstScreenMeasured(el.getBoundingClientRect().height);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onFirstScreenMeasured, place, upcomingShows]);

  const hasHeading = !!place;
  const cityHeadingClass = "font-semibold leading-[0.95]";
  const mobileHeadingSize = { fontSize: "clamp(1.75rem, 7vw, 2.25rem)" };
  const headingRowClass = `mt-3 mb-2 px-4 w-fit shrink-0 ${cityHeadingClass}`;
  const headingText = place ? `Pull up in ${place}` : null;

  const firstFour = upcomingShows.slice(0, 4);
  const firstScreenClone = (
    <div
      ref={firstScreenRef}
      aria-hidden
      className="absolute inset-x-0 top-0 -z-10 flex flex-col opacity-0 pointer-events-none"
    >
      {hasHeading && (
        <div aria-hidden className={`${headingRowClass} text-white`} style={mobileHeadingSize}>
          {headingText}
        </div>
      )}
      <div className="px-4 flex flex-col">
        {firstFour.map((event) => (
          <ShowRow key={`measure-${event.id}`} event={event} tone="dark" quietRsvp />
        ))}
      </div>
    </div>
  );

  const headingToneClass = tone === "dark" ? "text-white" : "text-neutral-900 dark:text-white";
  const surfaceToneClass = tone === "dark" ? "bg-black" : "bg-neutral-50 dark:bg-black";

  const pastTextClass = tone === "dark" ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400";
  const pastShowsLink =
    pastShows.length > 0 ? (
      <p className={`shrink-0 px-4 py-3 text-sm ${pastTextClass}`}>{pastShows.length} shows since March</p>
    ) : null;

  const sideHeading = variant === "side";
  const scheduleHeadingRow = (
    <div
      className={`flex shrink-0 gap-4 px-4 ${
        sideHeading ? "mt-4 mb-3 items-baseline" : "mt-3 mb-1 h-10 items-baseline"
      }`}
    >
      {headingText && (
        <h3
          className={`min-w-0 -mb-[0.2em] pb-[0.2em] ${cityHeadingClass} ${headingToneClass} truncate whitespace-nowrap`}
          style={{ fontSize: sideHeading ? "2.5rem" : "2rem" }}
        >
          {headingText}
        </h3>
      )}
      {pastShows.length > 0 && (
        <span className={`ml-auto shrink-0 text-sm font-normal ${pastTextClass}`}>
          {pastShows.length} shows since March
        </span>
      )}
    </div>
  );

  if (variant === "side") {
    return (
      <PendingRsvpProvider>
        <div className={`flex flex-col ${surfaceToneClass}`}>
          {scheduleHeadingRow}
          {firstFour.length > 0 && (
            <div className="flex shrink-0 flex-col px-4">
              {firstFour.map((event) => (
                <ShowRow key={event.id} event={event} tone={tone} quietRsvp size="lg" />
              ))}
            </div>
          )}
        </div>
      </PendingRsvpProvider>
    );
  }

  if (variant === "strip") {
    const stretch = stripRowPx != null && stripRowPx >= LIVE_STRIP_ROW_PX;
    const rowPx = stretch ? Math.min(stripRowPx, STRIP_ROW_MAX_PX) : null;
    const stripSize = stretch && stripRowPx >= STRIP_ROW_LG_PX ? "lg" : "md";
    return (
      <PendingRsvpProvider>
        <div className={`scrollbar-hide flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden ${surfaceToneClass}`}>
          {scheduleHeadingRow}
          {firstFour.length > 0 && (
            <div
              className={`grid shrink-0 gap-x-4 px-4 ${stripColumns === 4 ? "grid-cols-4" : "grid-cols-2"}`}
              style={rowPx != null ? { gridAutoRows: `${rowPx}px` } : undefined}
            >
              {firstFour.map((event) => (
                <ShowRow key={event.id} event={event} tone={tone} quietRsvp size={stripSize} />
              ))}
            </div>
          )}
        </div>
      </PendingRsvpProvider>
    );
  }

  return (
    <PendingRsvpProvider>
      <div className={`relative ${surfaceToneClass}`}>
        {place && (
          <h3
            className={`pt-3 pb-2 px-4 w-fit ${cityHeadingClass} ${headingToneClass}`}
            style={mobileHeadingSize}
          >
            Pull up in {place}
          </h3>
        )}
        <div className="px-4 flex flex-col">
          {upcomingShows.map((event) => (
            <ShowRow key={event.id} event={event} tone={tone} quietRsvp />
          ))}
        </div>
        {pastShowsLink}
        {children}
        {firstScreenClone}
      </div>
    </PendingRsvpProvider>
  );
}
