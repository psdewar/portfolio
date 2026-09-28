"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { PendingRsvpProvider, ShowRow } from "../components/ShowRow";
import type { TimelineEvent } from "../data/timeline";

export interface LiveSupportAskCore {
  upcomingShows: TimelineEvent[];
  pastShows?: TimelineEvent[];
  onOpenSupport: () => void;
  place?: string | null;
}

export function LiveSupportAsk({
  upcomingShows,
  pastShows = [],
  onOpenSupport,
  place,
  tone = "auto",
  variant = "panel",
  onFirstScreenMeasured,
  children,
}: LiveSupportAskCore & {
  tone?: "auto" | "dark";
  variant?: "panel" | "sheet";
  onFirstScreenMeasured?: (px: number) => void;
  children?: ReactNode;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    if (variant === "panel" && !scrollRef.current) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      root: variant === "panel" ? scrollRef.current : null,
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [variant]);

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

  const firstFour = upcomingShows.slice(0, 4);
  const firstScreenClone = (
    <div
      ref={firstScreenRef}
      aria-hidden
      className="absolute inset-x-0 top-0 -z-10 flex flex-col opacity-0 pointer-events-none"
    >
      {place && (
        <h3 className="pt-3 pb-2 px-4 w-fit text-lg font-semibold leading-tight text-white">
          I’ll be in {place}
        </h3>
      )}
      <div className="px-4 flex flex-col">
        {firstFour.map((event) => (
          <ShowRow key={`measure-${event.id}`} event={event} tone="dark" />
        ))}
      </div>
      <div className="-mt-6 px-4 pb-3 pt-6">
        <button
          type="button"
          tabIndex={-1}
          className="w-full min-h-[52px] rounded-xl font-bebas text-[26px] tracking-wide"
        >
          Fund My Tour
        </button>
      </div>
    </div>
  );

  const headingToneClass = tone === "dark" ? "text-white" : "text-neutral-900 dark:text-white";
  const surfaceToneClass = tone === "dark" ? "bg-black" : "bg-neutral-50 dark:bg-black";

  const fundButton = (
    <button
      type="button"
      onClick={onOpenSupport}
      className={`w-full min-h-[52px] rounded-xl font-bebas text-[26px] tracking-wide transition-[opacity,box-shadow] hover:opacity-90 active:opacity-80 ${
        tone === "dark" ? "bg-white text-neutral-900" : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
      } ${stuck ? "shadow-lg shadow-black/30 dark:shadow-black/60" : ""}`}
    >
      Fund My Tour
    </button>
  );

  if (variant === "sheet") {
    return (
      <PendingRsvpProvider>
        <div className={`relative ${surfaceToneClass}`}>
          {place && (
            <h3 className={`pt-3 pb-2 px-4 w-fit text-lg font-semibold leading-tight ${headingToneClass}`}>
              I’ll be in {place}
            </h3>
          )}
          <div className="px-4 flex flex-col">
            {upcomingShows.map((event) => (
              <ShowRow key={event.id} event={event} tone={tone} />
            ))}
          </div>
          <div ref={sentinelRef} aria-hidden className="h-px w-full" />
          <div
            className={`sticky z-10 px-4 py-2 transition-[top] duration-300 ${
              tone === "dark" ? "bg-neutral-900" : "bg-neutral-100 dark:bg-neutral-900"
            }`}
            style={{ top: "var(--header-offset, var(--header-h, 0px))", bottom: 0 }}
          >
            {fundButton}
          </div>
          <div className="px-4 pb-3 mt-1 flex flex-col">
            {pastShows.map((event) => (
              <ShowRow key={event.id} event={event} tone={tone} />
            ))}
          </div>
          {children}
          {firstScreenClone}
        </div>
      </PendingRsvpProvider>
    );
  }

  return (
    <PendingRsvpProvider>
      <div
        ref={scrollRef}
        className="scrollbar-hide relative flex h-full min-h-0 flex-col overflow-y-auto overflow-x-hidden overscroll-contain"
      >
        {place && (
          <h3 className={`mt-3 mb-2 px-4 w-fit text-lg font-semibold leading-tight shrink-0 ${headingToneClass}`}>
            I’ll be in {place}
          </h3>
        )}
        {upcomingShows.length > 0 && (
          <div className="px-4 flex flex-col shrink-0">
            {upcomingShows.map((event) => (
              <ShowRow key={event.id} event={event} tone={tone} />
            ))}
          </div>
        )}
        <div ref={sentinelRef} aria-hidden className="h-px w-full shrink-0" />
        <div className="sticky top-0 z-10 shrink-0 px-4 py-2 bg-neutral-100 dark:bg-neutral-900">{fundButton}</div>
        {pastShows.length > 0 && (
          <div className="px-4 pb-3 mt-1 flex flex-col shrink-0">
            {pastShows.map((event) => (
              <ShowRow key={event.id} event={event} tone={tone} />
            ))}
          </div>
        )}
        {firstScreenClone}
      </div>
    </PendingRsvpProvider>
  );
}
