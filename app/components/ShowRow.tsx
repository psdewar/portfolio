"use client";

import Link, { useLinkStatus } from "next/link";
import { createContext, useContext, useEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { formatEventDate, type TimelineEvent } from "../data/timeline";

interface PendingRsvpContextValue {
  pendingId: number | null;
  setPendingId: Dispatch<SetStateAction<number | null>>;
}

const PendingRsvpContext = createContext<PendingRsvpContextValue>({
  pendingId: null,
  setPendingId: () => {},
});

export function PendingRsvpProvider({ children }: { children: ReactNode }) {
  const [pendingId, setPendingId] = useState<number | null>(null);
  return (
    <PendingRsvpContext.Provider value={{ pendingId, setPendingId }}>
      {children}
    </PendingRsvpContext.Provider>
  );
}

function RsvpPendingWatcher({ id }: { id: number }) {
  const { pending } = useLinkStatus();
  const { setPendingId } = useContext(PendingRsvpContext);
  useEffect(() => {
    if (!pending) return;
    setPendingId(id);
    return () => setPendingId((cur) => (cur === id ? null : cur));
  }, [pending, id, setPendingId]);
  return null;
}

export function DateStack({
  date,
  hover = "",
  tone = "auto",
}: {
  date: ReturnType<typeof formatEventDate>;
  hover?: string;
  tone?: "auto" | "dark";
}) {
  const accentColor = tone === "dark" ? "text-white" : "text-neutral-900 dark:text-white";
  const smallLineClass = "text-[0.41em] uppercase tracking-wide leading-none [text-box:trim-both_cap_alphabetic] whitespace-nowrap";
  return (
    <div className="shrink-0 flex flex-col items-center gap-[0.2em] w-[0.8em] mr-[0.2em] text-3xl sm:text-4xl">
      <div className={`${smallLineClass} text-neutral-500`}>{date.month}</div>
      <div
        className={`font-bebas leading-none [text-box:trim-both_cap_alphabetic] transition-all duration-300 group-hover:scale-110 ${accentColor} ${hover}`}
      >
        {date.day}
      </div>
    </div>
  );
}

export function ShowRow({
  event,
  tone = "auto",
  bleed = "-mx-4 px-4",
}: {
  event: TimelineEvent;
  tone?: "auto" | "dark";
  bleed?: string;
}) {
  const dateInfo = formatEventDate(event.date);
  const isRsvp = !!event.url && event.urlLabel === "RSVP";
  const isFGTU = event.title.includes("From The Ground Up");
  const RowTag = (isRsvp ? Link : "div") as React.ElementType;

  const { pendingId } = useContext(PendingRsvpContext);
  const isPendingSelf = isRsvp && pendingId === event.id;
  const isPendingOther = isRsvp && pendingId !== null && pendingId !== event.id;

  const locationColor = tone === "dark" ? "text-white" : "text-neutral-900 dark:text-white";
  const descColor = tone === "dark" ? "text-neutral-400" : "text-neutral-500 dark:text-neutral-400";

  const info = (
    <div className="flex-1 min-w-0">
      <div className={`truncate text-lg sm:text-xl font-medium leading-tight ${locationColor}`}>
        {event.location}
      </div>
      {(!isFGTU || event.description) && (
        <div className={`truncate text-[12px] sm:text-[15px] leading-tight ${descColor}`}>
          {event.description ?? event.title}
        </div>
      )}
    </div>
  );

  const hoverBg = tone === "dark" ? "hover:bg-white/10" : "hover:bg-black/5 dark:hover:bg-white/10";
  const activeBg = tone === "dark" ? "active:bg-white/10" : "active:bg-black/5 dark:active:bg-white/10";
  const pendingBg = tone === "dark" ? "bg-white/15" : "bg-black/10 dark:bg-white/15";
  const focusRing =
    tone === "dark"
      ? "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white/60"
      : "focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-400";

  return (
    <RowTag
      {...(isRsvp ? { href: event.url } : {})}
      className={`group relative flex items-center gap-3 min-w-0 min-h-12 sm:min-h-14 ${
        isRsvp
          ? `${bleed} transition-colors ${isPendingSelf ? pendingBg : hoverBg} ${activeBg} ${focusRing} ${
              isPendingOther ? "pointer-events-none opacity-50" : ""
            }`
          : ""
      }`}
    >
      <DateStack date={dateInfo} tone={tone} />
      {info}
      {isRsvp && (
        <>
          <RsvpPendingWatcher id={event.id} />
          {isPendingSelf ? (
            <span
              className={`shrink-0 inline-flex items-center gap-1.5 font-bebas tracking-wide text-lg sm:text-xl ${
                tone === "dark" ? "text-yellow-400" : "text-neutral-900 dark:text-yellow-400"
              }`}
            >
              <span className="h-4 w-4 sm:h-5 sm:w-5 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />
              Opening
            </span>
          ) : (
            <span
              className={`shrink-0 font-bebas tracking-wide text-3xl sm:text-4xl transition-colors ${
                tone === "dark"
                  ? "text-yellow-400 group-hover:text-yellow-300"
                  : "text-neutral-900 dark:text-yellow-400 group-hover:text-neutral-700 dark:group-hover:text-yellow-300"
              }`}
            >
              RSVP
            </span>
          )}
        </>
      )}
    </RowTag>
  );
}
