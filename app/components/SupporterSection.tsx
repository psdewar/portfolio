"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import {
  XIcon,
  PlayIcon,
  PauseIcon,
  MicrophoneStageIcon,
  UserIcon,
  ArchiveIcon,
  CalendarPlusIcon,
} from "@phosphor-icons/react";

import { MonthlySupporter } from "./SupportModal";
import PatronSignInForm from "./PatronSignInForm";
import { getJourneyEvents, formatEventDate, EventType } from "../data/timeline";
import { TRACK_DATA } from "../data/tracks";
import { PATRON_CONFIG } from "../data/patron-config";
import { useAudio } from "../contexts/AudioContext";
import { usePatronStatus } from "../hooks/usePatronStatus";
import { useScrollLock } from "../hooks/useScrollLock";
import { type Show, showsToTimelineEvents } from "../lib/shows";
import { PLAY_MASK_STYLE } from "../lib/glyph-masks";

const formatDuration = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const eventTypeStyles: Record<
  EventType,
  { bg: string; text: string; label: string } | null
> = {
  show: {
    bg: "bg-neutral-200 dark:bg-neutral-700",
    text: "text-neutral-700 dark:text-neutral-200",
    label: "Show",
  },
  single: {
    bg: "bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    label: "Single",
  },
  feature: {
    bg: "bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    label: "Feature",
  },
  crowdfunding: {
    bg: "bg-neutral-200 dark:bg-neutral-700",
    text: "text-neutral-700 dark:text-neutral-200",
    label: "Crowdfunding",
  },
  content: {
    bg: "bg-neutral-200 dark:bg-neutral-700",
    text: "text-neutral-700 dark:text-neutral-200",
    label: "Content",
  },
  checkpoint: null,
  update: null,
};

interface SupporterSectionProps {
  onClose?: () => void;
  isModal?: boolean;
  forcePatron?: boolean;
  upcomingShows?: Show[];
  pastShows?: Show[];
  ask?: React.ReactNode;
  sponsorHref?: string;
  children?: React.ReactNode;
  og?: boolean;
}

const ROW_HOVER =
  "group transition-all duration-300 hover:bg-gradient-to-r hover:to-transparent active:bg-gradient-to-r active:to-transparent split:hover:pl-2";

const ROW_ACCENT = {
  rsvp: {
    row: "hover:from-[#d4a553]/15 active:from-[#d4a553]/15",
    day: "group-hover:text-[#d4a553] group-active:text-[#d4a553]",
  },
  song: {
    row: "hover:from-amber-500/15 active:from-amber-500/15",
    day: "group-hover:text-amber-500 group-active:text-amber-500",
  },
  info: {
    row: "hover:from-neutral-500/10 active:from-neutral-500/10",
    day: "group-hover:text-neutral-500 group-active:text-neutral-500",
  },
};

function DateStack({
  date,
  hover = "",
}: {
  date: ReturnType<typeof formatEventDate>;
  hover?: string;
}) {
  return (
    <div className="w-[0.8em] mr-[0.2em] shrink-0 flex flex-col items-center gap-[0.2em] text-3xl sm:text-4xl">
      <div className="text-[0.41em] uppercase tracking-wide leading-none [text-box:trim-both_cap_alphabetic] text-neutral-500">
        {date.month}
      </div>
      <div
        className={`font-bebas leading-none [text-box:trim-both_cap_alphabetic] text-neutral-900 dark:text-white transition-all duration-300 group-hover:scale-110 ${hover}`}
      >
        {date.day}
      </div>
    </div>
  );
}

export function SupporterSection({
  onClose,
  isModal = false,
  forcePatron = false,
  upcomingShows = [],
  pastShows = [],
  ask,
  sponsorHref,
  children,
  og = false,
}: SupporterSectionProps) {
  const {
    loadTrack,
    toggle,
    isPlaying,
    currentTrack,
    isLoading: isAudioLoading,
  } = useAudio();
  const router = useRouter();
  const patronStatus = usePatronStatus();
  const isPatron = (patronStatus || forcePatron) && !og;

  const [showCalendarInfo, setShowCalendarInfo] = useState(false);

  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verifyRedirectToPortal, setVerifyRedirectToPortal] = useState(false);
  useScrollLock(showVerifyForm);

  const containerRef = useRef<HTMLDivElement>(null);
  const tierSectionRef = useRef<HTMLElement>(null);
  const [showBottomCta, setShowBottomCta] = useState(false);
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const yearRefs = useRef<Map<string, HTMLElement>>(new Map());
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.location.hash === "#supporter") {
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(
        () => tierSectionRef.current?.scrollIntoView({ behavior: "smooth" }),
        300,
      );
    }
  }, []);

  useEffect(() => {
    if (!isModal) {
      posthog.capture("patron_page_viewed", { is_patron: isPatron });
    }
  }, []);

  useEffect(() => {
    if (isPatron) return;
    const tierSection = tierSectionRef.current;
    if (!tierSection) return;
    const root = isModal ? containerRef.current : null;
    const observer = new IntersectionObserver(
      ([entry]) =>
        setShowBottomCta(
          !entry.isIntersecting && entry.boundingClientRect.top < 0,
        ),
      { root, threshold: 0 },
    );
    observer.observe(tierSection);
    return () => observer.disconnect();
  }, [isPatron, isModal]);

  useEffect(() => {
    const root = isModal ? containerRef.current : null;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const year = entry.target.getAttribute("data-year");
            if (year) setActiveYear(year);
          }
        });
      },
      { root, rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );
    yearRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [isModal]);

  const showEvents = showsToTimelineEvents([...upcomingShows, ...pastShows]);
  const allEvents = [...showEvents, ...getJourneyEvents()];
  const upcomingDates = new Set(upcomingShows.map((s) => s.date));
  const isUpcomingEvent = (e: (typeof allEvents)[number]) =>
    e.type === "show" && upcomingDates.has(e.date);
  const journeyEvents = [
    ...allEvents
      .filter(isUpcomingEvent)
      .sort((a, b) =>
        a.date === b.date ? a.id - b.id : a.date < b.date ? -1 : 1,
      ),
    ...allEvents
      .filter((e) => !isUpcomingEvent(e))
      .sort((a, b) =>
        a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1,
      ),
  ];

  const hasUpcoming = journeyEvents.some(isUpcomingEvent);

  const eventsByYear = journeyEvents.reduce<
    Record<string, typeof journeyEvents>
  >((acc, event) => {
    const year = new Date(event.date + "T12:00:00").getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {});

  const years = Object.keys(eventsByYear).sort(
    (a, b) => parseInt(b) - parseInt(a),
  );

  const earlyAccessTracks = PATRON_CONFIG.earlyAccess.trackIds
    .map((id) => TRACK_DATA.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

  function renderEarlyAccessTracks(
    introText: string | null,
    onTrackClick: (track: (typeof earlyAccessTracks)[number]) => void,
  ): React.ReactNode {
    if (earlyAccessTracks.length === 0) return null;
    return (
      <div className="mb-4 split:mb-[clamp(0.25rem,calc(-50px_+_6vh),1rem)]">
        {introText && (
          <p className="text-neutral-900 dark:text-white font-medium mb-2 split:mb-[clamp(0.25rem,calc(-14px_+_2vh),0.5rem)]">
            {introText}
          </p>
        )}
        <div className="rounded-xl border-2 border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {earlyAccessTracks.map((track) => (
            <button
              type="button"
              key={track.id}
              onClick={() => onTrackClick(track)}
              className="w-full flex items-center gap-3 px-4 py-3 split:py-[clamp(0.625rem,calc(-32px_+_4vh),0.75rem)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
            >
              <span
                aria-hidden
                className="w-8 h-8 shrink-0 bg-gradient-to-br from-orange-400 to-pink-500"
                style={PLAY_MASK_STYLE}
              />
              <div className="flex-1 min-w-0">
                <div className="text-neutral-900 dark:text-white font-medium truncate">
                  {track.title}
                </div>
                {track.duration && (
                  <div className="text-neutral-500 dark:text-neutral-400 text-sm">
                    {formatDuration(track.duration)}
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function closeVerifyForm() {
    setShowVerifyForm(false);
    setVerifyRedirectToPortal(false);
  }

  function renderTimeline(): React.ReactNode {
    return years.map((year) => {
      const isActiveYear = year === activeYear;
      return (
        <section
          key={year}
          data-year={year}
          ref={(el) => {
            if (el) yearRefs.current.set(year, el);
            else yearRefs.current.delete(year);
          }}
          className="mb-16"
        >
          <div
            className={`flex items-end justify-between gap-3 sticky ${isModal ? "top-0" : "top-16 split:top-0"} backdrop-blur-md ${isModal ? "bg-white/80 dark:bg-neutral-900/80" : "bg-neutral-50/80 dark:bg-neutral-950/80 split:backdrop-blur-none split:bg-neutral-50 dark:split:bg-neutral-950"} z-10 py-3`}
            style={{ alignItems: "last baseline" }}
          >
            <h2
              className={`font-bebas text-[40px] md:text-[56px] leading-none pointer-events-none select-none transition-colors ${
                isActiveYear
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-300 dark:text-neutral-700"
              }`}
            >
              {year}
            </h2>
          </div>

          <div className="-mx-4 sm:-mx-6 lg:-mx-8 split:mx-0">
            {eventsByYear[year].map((event, i, events) => {
              const dateInfo = formatEventDate(event.date);
              const isUpcoming = isUpcomingEvent(event);
              const prev =
                i === 0
                  ? journeyEvents[journeyEvents.indexOf(events[0]) - 1]
                  : events[i - 1];
              const groupLabel =
                hasUpcoming && (!prev || isUpcomingEvent(prev) !== isUpcoming)
                  ? isUpcoming
                    ? "Coming up"
                    : "Since May '25"
                  : null;
              const style =
                event.type === "show" && event.location
                  ? null
                  : eventTypeStyles[event.type];
              const isFeature = event.type === "feature";
              const isContent = event.type === "content";
              const isSingle = event.type === "single";
              const isMusic = isSingle || isFeature;
              const isCheckpoint = event.type === "checkpoint";

              if (isCheckpoint) {
                return (
                  <div key={event.id} className="relative min-w-0">
                    <button
                      onClick={() => setShowCalendarInfo(true)}
                      className={`w-full flex items-center gap-3 px-4 sm:px-6 lg:px-8 split:px-0 py-3 sm:py-4 split:py-2.5 text-left ${ROW_HOVER} ${ROW_ACCENT.info.row}`}
                    >
                      <DateStack date={dateInfo} hover={ROW_ACCENT.info.day} />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-lg leading-tight text-neutral-900 dark:text-white">
                          {event.title}
                        </h3>
                      </div>
                      <div className="shrink-0 w-12 sm:w-14 flex items-center justify-center">
                        <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center font-serif text-sm text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors duration-300">
                          i
                        </span>
                      </div>
                    </button>
                  </div>
                );
              }

              const isFGTU = event.title.includes("From The Ground Up");
              const rowTrack = isSingle
                ? TRACK_DATA.find((t) => t.title === event.title)
                : undefined;
              const isRowPlaying =
                !!rowTrack && isPlaying && currentTrack?.id === rowTrack.id;
              const isRsvp = !!event.url && event.urlLabel === "RSVP";
              const RowTag = (
                isRsvp ? Link : rowTrack ? "button" : "div"
              ) as React.ElementType;
              const isRowLoading =
                !!rowTrack &&
                isAudioLoading &&
                currentTrack?.id === rowTrack.id;
              const playRowTrack = () => {
                if (!rowTrack) return;
                if (currentTrack?.id === rowTrack.id) {
                  toggle();
                } else {
                  loadTrack(
                    {
                      id: rowTrack.id,
                      title: rowTrack.title,
                      artist: rowTrack.artist,
                      src: rowTrack.audioUrl,
                      thumbnail: rowTrack.thumbnail,
                      duration: rowTrack.duration,
                    },
                    true,
                  );
                }
              };

              const rowAccent = isRsvp
                ? ROW_ACCENT.rsvp
                : rowTrack
                  ? ROW_ACCENT.song
                  : null;
              const isCityRow = event.type === "show" && !!event.location;

              return (
                <Fragment key={event.id}>
                  {groupLabel && (
                    <div className="px-4 sm:px-6 lg:px-8 split:px-0 pt-4 pb-1 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4 text-base font-medium text-neutral-500 dark:text-neutral-400">
                      {groupLabel}
                      {isUpcoming && sponsorHref && !og && (
                        <a
                          href={sponsorHref}
                          className="group -my-3 min-h-11 flex items-center gap-1.5 origin-right font-normal text-neutral-500 dark:text-neutral-400 transition-all duration-300 hover:scale-105 hover:text-neutral-900 dark:hover:text-white active:opacity-60"
                        >
                          <CalendarPlusIcon
                            size={20}
                            weight="regular"
                            className="shrink-0 transition-colors group-hover:text-[#d4a553]"
                          />
                          Host my concert
                        </a>
                      )}
                    </div>
                  )}
                  <RowTag
                    {...(isRsvp ? { href: event.url } : {})}
                    {...(rowTrack
                      ? {
                          onClick: playRowTrack,
                          "aria-label": `Play ${rowTrack.title}`,
                        }
                      : {})}
                    className={`flex items-center gap-3 px-4 sm:px-6 lg:px-8 split:px-0 ${rowTrack ? "w-full text-left" : "py-3 sm:py-4 split:py-2.5"} min-w-0${rowAccent ? ` ${ROW_HOVER} ${rowAccent.row}` : ""}`}
                  >
                    <DateStack date={dateInfo} hover={rowAccent?.day} />
                    {rowTrack && (
                      <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 overflow-hidden relative">
                        <img
                          src={rowTrack.thumbnail}
                          alt={rowTrack.title}
                          className="absolute inset-0 w-full h-full object-cover"
                          loading="eager"
                        />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                          {isRowLoading ? (
                            <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : isRowPlaying ? (
                            <PauseIcon
                              className="w-8 h-8 text-white"
                              weight="regular"
                            />
                          ) : (
                            <PlayIcon
                              className="w-8 h-8 text-white"
                              weight="regular"
                            />
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {style && (
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}
                          >
                            {style.label}
                          </span>
                          {event.location && (
                            <span className="min-w-0 break-words text-neutral-500 text-base split:truncate">
                              {event.location}
                            </span>
                          )}
                          {isContent && event.relatedSong && (
                            <span className="min-w-0 break-words text-neutral-500 text-base split:truncate">
                              {event.relatedSong}
                            </span>
                          )}
                          {isFeature && event.artist && (
                            <span className="min-w-0 break-words text-neutral-500 text-base split:truncate flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {event.artist}
                            </span>
                          )}
                        </div>
                      )}
                      <h3
                        className={`${isCityRow ? "font-medium text-lg leading-tight" : isMusic ? "font-bebas text-2xl leading-none" : isFGTU ? "font-bold text-lg uppercase tracking-wide" : "font-medium text-lg leading-tight"} text-neutral-900 dark:text-white ${style ? "mt-1.5" : ""} mb-0.5 break-words split:truncate`}
                        style={
                          isFGTU && !isCityRow
                            ? { fontFamily: '"Parkinsans", sans-serif' }
                            : undefined
                        }
                      >
                        {isCityRow ? event.location : event.title}
                      </h3>
                      {(isCityRow
                        ? !isFGTU || event.description
                        : event.description) && (
                        <p className="text-neutral-500 dark:text-neutral-400 text-base">
                          {isCityRow && !isFGTU && event.description ? (
                            <>
                              {event.description}
                              <br />
                              {event.title}
                            </>
                          ) : (
                            (event.description ?? event.title)
                          )}
                        </p>
                      )}
                      {event.url &&
                        event.urlLabel &&
                        event.urlLabel !== "RSVP" && (
                          <Link
                            href={event.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block mt-1.5 text-base text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
                          >
                            {event.urlLabel}
                          </Link>
                        )}
                    </div>

                    {event.media && (
                      <img
                        src={event.media}
                        alt=""
                        className="shrink-0 self-stretch w-12 sm:w-14 object-contain"
                      />
                    )}
                    {isRsvp && (
                      <span className="shrink-0 flex items-center gap-2 text-3xl sm:text-4xl">
                        <span className="text-[0.41em] uppercase tracking-wide leading-none text-neutral-500">
                          {dateInfo.dayOfWeek}
                        </span>
                        <span className="shrink-0 rounded border-2 border-neutral-300 dark:border-neutral-700 px-2 py-1.5 font-mono text-[0.41em] uppercase tracking-wider leading-none text-neutral-500 dark:text-neutral-400 transition-all duration-300 group-hover:border-[#d4a553] group-hover:bg-[#d4a553] group-hover:text-neutral-950 group-hover:shadow-[0_0_18px_rgba(212,165,83,0.55)]">
                          RSVP NOW
                        </span>
                      </span>
                    )}
                  </RowTag>
                </Fragment>
              );
            })}
            {year === years[years.length - 1] && renderArchiveRow()}
          </div>
        </section>
      );
    });
  }

  function renderArchiveRow(): React.ReactNode {
    return (
      <Link
        href="/shop?tab=exhibit"
        className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 split:px-0 py-3 sm:py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors group"
      >
        <div className="w-12 sm:w-14 shrink-0 flex items-center justify-center">
          <ArchiveIcon className="w-11 h-11 sm:w-[3.125rem] sm:h-[3.125rem] text-neutral-400 dark:text-neutral-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-lg text-neutral-700 dark:text-neutral-300">
            From The Archives: Exhibit PSD
          </h3>
        </div>
        <div className="shrink-0 pr-4 font-mono text-base text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors whitespace-nowrap">
          2013-2015 &rarr;
        </div>
      </Link>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-neutral-50 dark:bg-neutral-950 relative ${isModal ? "h-full overflow-y-auto" : "split:h-[calc(100dvh-4rem-1px-var(--player-h,0px))] split:overflow-hidden split:grid split:grid-cols-2 split:gap-x-0 split:max-w-7xl split:mx-auto split:px-8"}${og ? " supporter--og" : ""}`}
    >
      {og && (
        <style>{`
          .supporter--og #ask-slot { padding-top: 12px; padding-bottom: 0; }
        `}</style>
      )}
      {/* Modal close button */}
      {isModal && (
        <div className="sticky top-0 z-20 flex items-center justify-end p-4 sm:p-6">
          <button
            onClick={onClose}
            className="w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
          >
            <XIcon size={20} weight="bold" className="text-neutral-500" />
          </button>
        </div>
      )}

      <div className="split:min-w-0 split:overflow-y-auto split:[scrollbar-width:none] split:[&::-webkit-scrollbar]:hidden split:-ml-8 split:pl-8 split:pr-6 split:border-r split:border-neutral-200 dark:split:border-neutral-800 split:pb-[clamp(0rem,calc(-144px_+_16vh),2rem)]">
        <div id="ask-slot">{ask}</div>

        {!isPatron && (
          <section
            id="supporter"
            ref={tierSectionRef}
            className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 md:pb-12 split:pb-[clamp(0.5rem,calc(-172px_+_20vh),3rem)] split:px-0 split:max-w-none split:mx-0 scroll-mt-16"
          >
            <div className="max-w-lg mx-auto split:max-w-none split:mx-0">
              <MonthlySupporter
                heading="h1"
                source={isModal ? "modal" : "page"}
                preview={
                  earlyAccessTracks[0]
                    ? {
                        title: earlyAccessTracks[0].title,
                        src: `/audio/${earlyAccessTracks[0].id}-preview.mp3`,
                        autoplay: false,
                      }
                    : null
                }
                panelBleed="-mx-4 sm:mx-0 sm:rounded-lg [--tp-x:1rem] sm:[--tp-x:1.5rem]"
                og={og}
                onSignIn={og ? undefined : () => setShowVerifyForm(true)}
              />
            </div>
          </section>
        )}

        {isPatron && (
          <section
            id="supporter"
            className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 md:pb-12 split:pb-[clamp(0.5rem,calc(-172px_+_20vh),3rem)] split:px-0 split:max-w-none split:mx-0 scroll-mt-16"
          >
            <div className="max-w-lg mx-auto split:max-w-none split:mx-0">
              <div className="mb-5 split:mb-[clamp(0.25rem,calc(-50px_+_6vh),1rem)]">
                <h1 className="font-bebas text-3xl text-neutral-900 dark:text-white">
                  You&apos;re a monthly supporter
                </h1>
                <p className="text-base text-neutral-500 dark:text-neutral-400 mt-1">
                  Thank you for supporting my journey as an independent artist.
                </p>
              </div>
              {renderEarlyAccessTracks("Unlocked for you", (track) =>
                router.push(`/listen?play=${track.id}`),
              )}
              <div className="mb-4 split:mb-[clamp(0.25rem,calc(-50px_+_6vh),1rem)]">
                <button
                  type="button"
                  onClick={() => {
                    const email = localStorage.getItem("patronEmail");
                    if (email) {
                      window.location.assign(
                        `/api/stripe-portal?email=${encodeURIComponent(email)}`,
                      );
                    } else {
                      setVerifyRedirectToPortal(true);
                      setShowVerifyForm(true);
                    }
                  }}
                  className="w-full py-3.5 split:py-[clamp(0.5rem,calc(-32px_+_4vh),0.875rem)] rounded-xl border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 text-base font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Manage my subscription
                </button>
              </div>
            </div>
          </section>
        )}

        {children}
      </div>

      {/* Journey timeline */}
      <section
        className={`px-4 sm:px-6 lg:px-8 split:px-0 split:pl-6 split:max-w-none split:mx-0 split:min-w-0 split:flex split:flex-col split:min-h-0 split:pb-0 ${isPatron ? "pb-8" : "pb-32"}`}
      >
        <div
          ref={timelineRef}
          className="split:flex-1 split:min-h-0 split:overflow-y-auto split:[scrollbar-width:none] split:[&::-webkit-scrollbar]:hidden split:pb-8"
        >
          <div className="max-w-lg mx-auto w-full split:max-w-none split:mx-0 split:pt-[clamp(1.5rem,calc(-84px_+_12vh),3rem)]">
            <h1 className="font-bebas text-3xl text-neutral-900 dark:text-white">
              Stacking the Days
            </h1>
            <p className="text-base text-neutral-500 dark:text-neutral-400 mb-4">
              From The Ground Up
            </p>
            {renderTimeline()}
          </div>
        </div>
      </section>

      {/* Floating CTA */}
      {!isPatron && showBottomCta && !og && (
        <button
          onClick={() =>
            tierSectionRef.current?.scrollIntoView({ behavior: "smooth" })
          }
          className={`${isModal ? "absolute" : "fixed"} left-1/2 -translate-x-1/2 z-50 min-h-[54px] px-5 sm:px-8 flex items-center justify-center gap-2 rounded-xl text-white text-[20px] font-semibold whitespace-nowrap shadow-lg cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]`}
          style={{
            background: "linear-gradient(to right, #f97316, #ec4899)",
            bottom: isModal ? "80px" : "max(80px, var(--player-h, 0px))",
          }}
        >
          <MicrophoneStageIcon className="w-6 h-6" weight="regular" />
          Be my monthly supporter
        </button>
      )}

      {showVerifyForm && (
        <div
          className={`${isModal ? "absolute" : "fixed"} inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4`}
          onClick={closeVerifyForm}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-xl font-semibold text-neutral-900 dark:text-white">
              Sign in with your supporter email
            </h2>
            <PatronSignInForm
              onCancel={closeVerifyForm}
              onVerified={(email) => {
                closeVerifyForm();
                if (verifyRedirectToPortal) {
                  window.location.assign(
                    `/api/stripe-portal?email=${encodeURIComponent(email)}`,
                  );
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Calendar Info Modal */}
      {showCalendarInfo && (
        <div
          className={`${isModal ? "absolute" : "fixed"} inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4`}
          onClick={() => setShowCalendarInfo(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bebas text-2xl text-neutral-900 dark:text-white">
                What is Naw-Ruz?
              </h3>
              <button
                onClick={() => setShowCalendarInfo(false)}
                className="w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
              >
                <XIcon className="w-4 h-4 text-neutral-500" weight="bold" />
              </button>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 text-base leading-relaxed mb-4">
              Naw-Ruz means "new day." As a Baha'i, I celebrate the new year at
              the vernal equinox, the first day of spring.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
