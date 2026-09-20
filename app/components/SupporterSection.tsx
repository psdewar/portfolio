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
} from "@phosphor-icons/react";

import SupportModal from "./SupportModal";
import { getJourneyEvents, formatEventDate, EventType } from "../data/timeline";
import { TRACK_DATA } from "../data/tracks";
import { PATRON_CONFIG } from "../data/patron-config";
import { useAudio } from "../contexts/AudioContext";
import { usePatronStatus } from "../hooks/usePatronStatus";
import {
  activatePatronStatus,
  storePatronEmail,
  storePatronTier,
} from "../lib/patron";
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
  children?: React.ReactNode;
  og?: boolean;
}

export function SupporterSection({
  onClose,
  isModal = false,
  forcePatron = false,
  upcomingShows = [],
  pastShows = [],
  ask,
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

  const [showTierModal, setShowTierModal] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<{
    title: string;
    src: string;
    autoplay?: boolean;
  } | null>(null);

  const [showCalendarInfo, setShowCalendarInfo] = useState(false);

  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [verifyRedirectToPortal, setVerifyRedirectToPortal] = useState(false);

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

  const handleVerifyPatron = async () => {
    if (!verifyEmail.trim()) return;
    setVerifyLoading(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/verify-patron", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const email = verifyEmail.trim().toLowerCase();
        activatePatronStatus();
        storePatronEmail(email);
        storePatronTier(data.tier ?? null);
        setShowVerifyForm(false);
        if (verifyRedirectToPortal) {
          setVerifyRedirectToPortal(false);
          window.location.assign(
            `/api/stripe-portal?email=${encodeURIComponent(email)}`,
          );
        }
      } else {
        const data = await res.json();
        setVerifyError(
          data.error === "No subscription found" ||
            data.error === "No active subscription"
            ? "No active subscription found for this email"
            : "Verification failed",
        );
      }
    } catch {
      setVerifyError("Something went wrong");
    } finally {
      setVerifyLoading(false);
    }
  };

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
  const openTierModal = () => {
    let opens = 0;
    try {
      opens = Number(localStorage.getItem("tierPreviewOpens")) || 0;
      localStorage.setItem("tierPreviewOpens", String(opens + 1));
    } catch {}
    const track = earlyAccessTracks[opens % earlyAccessTracks.length];
    setPreviewTrack(
      track
        ? {
            title: track.title,
            src: `/audio/${track.id}-preview.mp3`,
            autoplay: false,
          }
        : null,
    );
    setShowTierModal(true);
  };

  function renderEarlyAccessTracks(
    introText: string,
    onTrackClick: (track: (typeof earlyAccessTracks)[number]) => void,
  ): React.ReactNode {
    if (earlyAccessTracks.length === 0) return null;
    return (
      <div className="mb-4 split:mb-[clamp(0.25rem,calc(-50px_+_6vh),1rem)]">
        <p className="text-neutral-900 dark:text-white font-medium mb-2 split:mb-[clamp(0.25rem,calc(-14px_+_2vh),0.5rem)]">
          {introText}
        </p>
        <div className="rounded-xl border-2 border-neutral-200 dark:border-neutral-800 divide-y-2 divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
          {earlyAccessTracks.map((track) => (
            <button
              type="button"
              key={track.id}
              onClick={() => onTrackClick(track)}
              className="w-full flex items-center gap-3 px-4 py-3 split:py-[clamp(0.25rem,calc(-32px_+_4vh),0.75rem)] hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
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

  function renderVerifyForm(): React.ReactNode {
    return (
      <div className="max-w-sm mx-auto space-y-3">
        <input
          type="email"
          placeholder="Enter your email"
          value={verifyEmail}
          onChange={(e) => setVerifyEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleVerifyPatron()}
          className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
        {verifyError && <p className="text-red-500 text-base">{verifyError}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowVerifyForm(false);
              setVerifyEmail("");
              setVerifyError("");
              setVerifyRedirectToPortal(false);
            }}
            className="flex-1 py-3 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-base"
          >
            Cancel
          </button>
          <button
            onClick={handleVerifyPatron}
            disabled={verifyLoading || !verifyEmail.trim()}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-base rounded-lg font-medium"
          >
            {verifyLoading ? "Checking..." : "Verify"}
          </button>
        </div>
      </div>
    );
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
                  <div
                    key={event.id}
                    className="relative min-w-0 border-t border-neutral-200 dark:border-neutral-800"
                  >
                    <button
                      onClick={() => setShowCalendarInfo(true)}
                      className="w-full flex items-center gap-3 px-4 sm:px-6 lg:px-8 split:px-0 py-3 sm:py-4 bg-neutral-100/50 dark:bg-neutral-900/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors text-left group"
                    >
                      <div className="w-12 sm:w-14 shrink-0 flex flex-col items-center">
                        <div className="text-xs uppercase tracking-wide leading-none text-neutral-500">
                          {dateInfo.month}
                        </div>
                        <div className="font-bebas text-3xl sm:text-4xl leading-none text-neutral-400 dark:text-neutral-500">
                          {dateInfo.day}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-lg text-neutral-700 dark:text-neutral-300">
                          {event.title}
                        </h3>
                      </div>
                      <div className="shrink-0 w-12 sm:w-14 flex items-center justify-center font-serif text-sm italic text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors">
                        i
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
                !!rowTrack && isAudioLoading && currentTrack?.id === rowTrack.id;
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

              const isCityRow = event.type === "show" && !!event.location;
              const divider =
                " border-t border-neutral-200 dark:border-neutral-800";

              return (
                <Fragment key={event.id}>
                  {groupLabel && (
                    <div className="px-4 sm:px-6 lg:px-8 split:px-0 pt-4 pb-1 text-base font-medium text-neutral-500 dark:text-neutral-400">
                      {groupLabel}
                    </div>
                  )}
                  <RowTag
                    {...(isRsvp ? { href: event.url } : {})}
                    {...(rowTrack ? { onClick: playRowTrack, "aria-label": `Play ${rowTrack.title}` } : {})}
                    className={`flex items-center gap-3 px-4 sm:px-6 lg:px-8 split:px-0 ${rowTrack ? "w-full text-left group" : "py-3 sm:py-4 split:py-2.5"} min-w-0${divider}${isRsvp ? " group hover:bg-gradient-to-r hover:from-[#d4a553]/15 hover:to-transparent split:hover:pl-2 transition-all duration-300" : ""}`}
                  >
                    <div className="w-12 sm:w-14 shrink-0 flex flex-col items-center">
                      <div
                        className={`text-xs uppercase tracking-wide leading-none ${isUpcoming ? "text-[#b8862f] dark:text-[#d4a553]" : "text-neutral-500"}`}
                      >
                        {dateInfo.month}
                      </div>
                      <div
                        className={`font-bebas text-3xl sm:text-4xl leading-none transition-all duration-300 group-hover:scale-110 group-hover:text-[#d4a553] ${isUpcoming ? "text-[#b8862f] dark:text-[#d4a553]" : "text-neutral-900 dark:text-white"}`}
                      >
                        {dateInfo.day}
                      </div>
                    </div>
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
                            <PauseIcon className="w-8 h-8 text-white" weight="regular" />
                          ) : (
                            <PlayIcon className="w-8 h-8 text-white" weight="regular" />
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
                            <span className="text-neutral-500 text-base truncate">
                              {event.location}
                            </span>
                          )}
                          {isContent && event.relatedSong && (
                            <span className="text-neutral-500 text-base truncate">
                              {event.relatedSong}
                            </span>
                          )}
                          {isFeature && event.artist && (
                            <span className="text-neutral-500 text-base truncate flex items-center gap-1">
                              <UserIcon className="w-3 h-3" />
                              {event.artist}
                            </span>
                          )}
                        </div>
                      )}
                      <h3
                        className={`${isCityRow ? "font-medium text-lg leading-tight" : isMusic ? "font-bebas text-2xl leading-none" : isFGTU ? "font-bold text-lg uppercase tracking-wide" : "font-medium text-lg"} text-neutral-900 dark:text-white ${style ? "mt-1.5" : ""} mb-0.5 truncate`}
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
                              {event.title}
                              <br />
                              {event.description}
                            </>
                          ) : (
                            event.description ?? event.title
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
                      <span className="shrink-0 flex items-center gap-2">
                        <span
                          className={`text-base uppercase tracking-wide ${isUpcoming ? "text-[#b8862f] dark:text-[#d4a553]" : "text-neutral-500"}`}
                        >
                          {dateInfo.dayOfWeek}
                        </span>
                        <span className="shrink-0 rounded border-2 border-neutral-300 dark:border-neutral-700 px-2 py-1 font-mono text-base uppercase tracking-wider text-neutral-500 dark:text-neutral-400 transition-all duration-300 group-hover:border-[#d4a553] group-hover:bg-[#d4a553] group-hover:text-neutral-950 group-hover:shadow-[0_0_18px_rgba(212,165,83,0.55)]">
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
              <div className="mb-4 split:mb-[clamp(0.25rem,calc(-50px_+_6vh),1rem)]">
                <h1 className="font-bebas text-3xl text-neutral-900 dark:text-white">
                  Be my monthly supporter
                </h1>
                <p className="text-base text-neutral-500 dark:text-neutral-400 mt-1">
                  Every tier unlocks the same unreleased music and
                  behind-the-scenes content. Give what you can.
                </p>
              </div>
              <div className="mb-4 split:mb-[clamp(0.25rem,calc(-50px_+_6vh),1rem)]">
                {!og ? (
                  <button
                    type="button"
                    onClick={openTierModal}
                    className="group w-full text-center"
                  >
                    <span
                      className="min-h-[54px] flex items-center justify-center gap-2 py-3.5 split:py-[clamp(0.5rem,calc(-32px_+_4vh),0.875rem)] rounded-xl text-white text-[20px] font-semibold shadow-lg transition-transform group-hover:scale-[1.02] group-active:scale-[0.98]"
                      style={{
                        background:
                          "linear-gradient(to right, #f97316, #ec4899)",
                      }}
                    >
                      <MicrophoneStageIcon
                        className="w-6 h-6"
                        weight="regular"
                      />
                      Choose your tier
                    </span>
                    <span className="block mt-1 text-base text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-800 dark:group-hover:text-neutral-200 transition-colors">
                      Think Patreon, but I receive 100% of your support.
                    </span>
                  </button>
                ) : (
                  <p className="text-left text-base text-neutral-500 dark:text-neutral-400">
                    Think Patreon, but I receive 100% of your support.
                  </p>
                )}
              </div>
              {renderEarlyAccessTracks(
                "Supporters get my unreleased songs first",
                (track) => {
                  setPreviewTrack({
                    title: track.title,
                    src: `/audio/${track.id}-preview.mp3`,
                  });
                  setShowTierModal(true);
                },
              )}
              {!og && (
                <div className="text-center mt-2 split:mt-[clamp(0.25rem,calc(-14px_+_2vh),0.5rem)]">
                  {!showVerifyForm ? (
                    <button
                      onClick={() => setShowVerifyForm(true)}
                      className="inline-block py-3 split:py-[clamp(0.25rem,calc(-32px_+_4vh),0.75rem)] text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200 text-base underline underline-offset-2 transition-colors"
                    >
                      Already a monthly supporter? Sign in
                    </button>
                  ) : (
                    renderVerifyForm()
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {isPatron && (
          <section
            id="supporter"
            className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 md:pb-12 split:pb-[clamp(0.5rem,calc(-172px_+_20vh),3rem)] split:px-0 split:max-w-none split:mx-0 scroll-mt-16"
          >
            <div className="max-w-lg mx-auto split:max-w-none split:mx-0">
              <div className="mb-4 split:mb-[clamp(0.25rem,calc(-50px_+_6vh),1rem)]">
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
              {showVerifyForm && (
                <div className="text-center mt-2 split:mt-[clamp(0.25rem,calc(-14px_+_2vh),0.5rem)]">
                  {renderVerifyForm()}
                </div>
              )}
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
          onClick={openTierModal}
          className={`${isModal ? "absolute" : "fixed"} left-1/2 -translate-x-1/2 z-50 min-h-[54px] px-8 flex items-center justify-center rounded-xl text-white text-[20px] font-semibold whitespace-nowrap shadow-lg cursor-pointer transition-transform hover:scale-[1.02] active:scale-[0.98]`}
          style={{
            background: "linear-gradient(to right, #f97316, #ec4899)",
            bottom: isModal ? "80px" : "max(80px, var(--player-h, 0px))",
          }}
        >
          Be my monthly supporter
        </button>
      )}

      <SupportModal
        open={showTierModal && !isPatron}
        onOpenChange={setShowTierModal}
        preview={previewTrack}
        source={isModal ? "modal" : "page"}
        absoluteOverlay={isModal}
      />
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
