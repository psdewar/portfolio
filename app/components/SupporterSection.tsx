"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
import {
  getJourneyEvents,
  getTourConcertCount,
  formatEventDate,
  EventType,
  TimelineEvent,
} from "../data/timeline";
import { TRACK_DATA } from "../data/tracks";
import { PATRON_CONFIG } from "../data/patron-config";
import { useDevTools } from "../contexts/DevToolsContext";
import { useAudio } from "../contexts/AudioContext";
import { type Show, isResidence, getVenueLabel } from "../lib/shows";
import { PLAY_MASK_STYLE } from "../lib/glyph-masks";

const formatDuration = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

const eventTypeStyles: Record<EventType, { bg: string; text: string; label: string } | null> = {
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
  children?: React.ReactNode;
}

export function SupporterSection({
  onClose,
  isModal = false,
  forcePatron = false,
  upcomingShows = [],
  children,
}: SupporterSectionProps) {
  const { simulatePatron } = useDevTools();
  const { loadTrack, toggle, isPlaying, currentTrack, isLoading: isAudioLoading } = useAudio();

  const [showTierModal, setShowTierModal] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<{ title: string; src: string } | null>(null);
  const [isPatron, setIsPatron] = useState(forcePatron);

  const [showCalendarInfo, setShowCalendarInfo] = useState(false);

  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const tierSectionRef = useRef<HTMLElement>(null);
  const [showBottomCta, setShowBottomCta] = useState(false);
  const [atBottom, setAtBottom] = useState(false);
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const yearRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    if (window.location.hash === "#supporter") {
      window.history.replaceState({}, "", window.location.pathname);
      setTimeout(() => tierSectionRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
    }
  }, []);

  useEffect(() => {
    if (simulatePatron) {
      setIsPatron(true);
      return;
    }
    const status = localStorage.getItem("patronStatus");
    const email = localStorage.getItem("patronEmail");
    if (status === "active" && email) setIsPatron(true);
    else if (status === "active") localStorage.removeItem("patronStatus");
  }, [forcePatron, simulatePatron]);

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
      ([entry]) => setShowBottomCta(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { root, threshold: 0 },
    );
    observer.observe(tierSection);
    return () => observer.disconnect();
  }, [isPatron, isModal]);

  useEffect(() => {
    if (isPatron) return;
    const onScroll = () => {
      setAtBottom(window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [isPatron]);

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
        localStorage.setItem("patronStatus", "active");
        localStorage.setItem("patronEmail", verifyEmail.trim().toLowerCase());
        setIsPatron(true);
        setShowVerifyForm(false);
      } else {
        const data = await res.json();
        setVerifyError(
          data.error === "No subscription found" || data.error === "No active subscription"
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

  const upcomingEvents: TimelineEvent[] = upcomingShows.map((s) => ({
    id: Number(s.date.replace(/-/g, "") + "50"),
    date: s.date,
    title: s.name === "From The Ground Up" ? "From The Ground Up Live Concert" : s.name,
    location: `${s.city}, ${s.region}`,
    description: isResidence(s) ? "House concert" : getVenueLabel(s) ?? undefined,
    type: "show",
    ...(s.visibility !== "private" ? { url: `/rsvp/${s.slug}`, urlLabel: "RSVP" } : {}),
  }));
  const pastEvents = getJourneyEvents();
  const journeyEvents = [...upcomingEvents, ...pastEvents];
  const showCount = getTourConcertCount();

  const eventsByYear = journeyEvents.reduce<Record<string, typeof journeyEvents>>((acc, event) => {
    const year = new Date(event.date + "T12:00:00").getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {});

  const years = Object.keys(eventsByYear).sort((a, b) => parseInt(b) - parseInt(a));

  const patienceTrack = TRACK_DATA.find((t) => t.id === "patience");

  const earlyAccessTracks = PATRON_CONFIG.earlyAccess.trackIds
    .map((id) => TRACK_DATA.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t);

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
            className={`flex items-end justify-between gap-3 sticky ${isModal ? "top-0" : "top-16"} backdrop-blur-md bg-neutral-50/80 dark:bg-neutral-950/80 z-10 py-4`}
            style={{ alignItems: "last baseline" }}
          >
            <h2
              className={`font-bebas text-[56px] md:text-[80px] leading-none pointer-events-none select-none transition-colors ${
                isActiveYear
                  ? "text-neutral-900 dark:text-neutral-100"
                  : "text-neutral-200 dark:text-neutral-800"
              }`}
            >
              {year}
            </h2>
            {year === years[0] && (
              <span className="shrink-0 select-none pointer-events-none text-right font-mono text-[10px] uppercase leading-tight tracking-wider text-neutral-400 dark:text-neutral-500 sm:text-xs">
                <span className="block">{showCount} concerts so far</span>
                <span className="block">hundreds of participants</span>
              </span>
            )}
          </div>

          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
            {eventsByYear[year].map((event) => {
              const dateInfo = formatEventDate(event.date);
              const style = eventTypeStyles[event.type];
              const isFeature = event.type === "feature";
              const isContent = event.type === "content";
              const isSingle = event.type === "single";
              const isMusic = isSingle || isFeature;
              const isCheckpoint = event.type === "checkpoint";

              if (isCheckpoint) {
                return (
                  <div key={event.id} className="relative">
                    <button
                      onClick={() => setShowCalendarInfo(true)}
                      className="w-full flex items-center gap-3 py-3 sm:py-4 bg-neutral-100/50 dark:bg-neutral-900/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors text-left group"
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
                        <h3 className="font-medium text-base sm:text-lg text-neutral-700 dark:text-neutral-300">
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
              const isPatience = isSingle && event.title === "Patience" && patienceTrack;
              const isPatiencePlaying = isPatience && isPlaying && currentTrack?.id === "patience";
              const isRsvp = !!event.url && event.urlLabel === "RSVP";
              const RowTag = (isRsvp ? Link : "div") as React.ElementType;

              return (
                <RowTag
                  key={event.id}
                  {...(isRsvp ? { href: event.url } : {})}
                  className={`flex items-center gap-3 py-3 sm:py-4${isRsvp ? " group hover:bg-gradient-to-r hover:from-[#d4a553]/15 hover:to-transparent hover:pl-2 transition-all duration-300" : ""}`}
                >
                  <div className="w-12 sm:w-14 shrink-0 flex flex-col items-center">
                    <div className="text-xs uppercase tracking-wide leading-none text-neutral-500">
                      {dateInfo.month}
                    </div>
                    <div className="font-bebas text-3xl sm:text-4xl leading-none text-neutral-900 dark:text-white transition-all duration-300 group-hover:scale-110 group-hover:text-[#d4a553]">
                      {dateInfo.day}
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    {style && (
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-medium ${style.bg} ${style.text}`}
                        >
                          {style.label}
                        </span>
                        {event.location && (
                          <span className="text-neutral-500 text-sm truncate">
                            {event.location}
                          </span>
                        )}
                        {isContent && event.relatedSong && (
                          <span className="text-neutral-500 text-sm truncate">
                            {event.relatedSong}
                          </span>
                        )}
                        {isFeature && event.artist && (
                          <span className="text-neutral-500 text-sm truncate flex items-center gap-1">
                            <UserIcon className="w-3 h-3" />
                            {event.artist}
                          </span>
                        )}
                      </div>
                    )}
                    <h3
                      className={`${isFGTU ? "font-bold text-sm sm:text-base uppercase tracking-wide" : isMusic ? "font-bebas text-xl sm:text-2xl leading-none" : "font-medium text-sm sm:text-base"} text-neutral-900 dark:text-white ${style ? "mt-1.5" : ""} mb-0.5`}
                      style={isFGTU ? { fontFamily: '"Parkinsans", sans-serif' } : undefined}
                    >
                      {event.title}
                    </h3>
                    {event.description && (
                      <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                        {event.description}
                      </p>
                    )}
                    {event.url && event.urlLabel && event.urlLabel !== "RSVP" && (
                      <Link
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1.5 text-sm text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
                      >
                        {event.urlLabel}
                      </Link>
                    )}
                  </div>

                  {isRsvp && (
                    <span className="shrink-0 rounded border-2 border-neutral-300 dark:border-neutral-700 px-2 py-1 font-mono text-xs uppercase tracking-wider text-neutral-500 dark:text-neutral-400 transition-all duration-300 group-hover:scale-110 group-hover:border-[#d4a553] group-hover:bg-[#d4a553] group-hover:text-neutral-950 group-hover:shadow-[0_0_18px_rgba(212,165,83,0.55)]">
                      RSVP NOW
                    </span>
                  )}
                  {isPatience &&
                    patienceTrack &&
                    (() => {
                      const isPatienceLoading = isAudioLoading && currentTrack?.id === "patience";
                      return (
                        <button
                          onClick={() => {
                            if (currentTrack?.id === "patience") {
                              toggle();
                            } else {
                              loadTrack(
                                {
                                  id: patienceTrack.id,
                                  title: patienceTrack.title,
                                  artist: patienceTrack.artist,
                                  src: patienceTrack.audioUrl,
                                  thumbnail: patienceTrack.thumbnail,
                                  duration: patienceTrack.duration,
                                },
                                true,
                              );
                            }
                          }}
                          className="shrink-0 w-16 sm:w-20 self-stretch -my-3 sm:-my-4 overflow-hidden relative group"
                        >
                          <img
                            src={patienceTrack.thumbnail}
                            alt="Patience"
                            className="w-full h-full object-cover"
                            loading="eager"
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                            {isPatienceLoading ? (
                              <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : isPatiencePlaying ? (
                              <PauseIcon className="w-8 h-8 text-white" weight="regular" />
                            ) : (
                              <PlayIcon className="w-8 h-8 text-white" weight="regular" />
                            )}
                          </div>
                        </button>
                      );
                    })()}
                </RowTag>
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
        className="flex items-center gap-3 py-3 sm:py-4 bg-neutral-100/50 dark:bg-neutral-900/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors group"
      >
        <div className="w-12 sm:w-14 shrink-0 flex items-center justify-center">
          <ArchiveIcon className="w-11 h-11 sm:w-[3.125rem] sm:h-[3.125rem] text-neutral-400 dark:text-neutral-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm sm:text-base text-neutral-700 dark:text-neutral-300">
            From The Archives: Exhibit PSD
          </h3>
        </div>
        <div className="shrink-0 pr-4 font-mono text-sm text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors whitespace-nowrap">
          2013-2015 &rarr;
        </div>
      </Link>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`bg-neutral-50 dark:bg-neutral-950 relative ${isModal ? "h-full overflow-y-auto" : ""}`}
    >
      {/* Modal close button */}
      {isModal && (
        <div className="sticky top-0 z-20 flex items-center justify-end p-4 sm:p-6">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
          >
            <XIcon size={20} weight="bold" className="text-neutral-500" />
          </button>
        </div>
      )}

      {/* Become a Monthly Supporter */}
      {!isPatron && (
        <section
          id="supporter"
          ref={tierSectionRef}
          className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 md:pb-12 scroll-mt-16"
        >
          <div className="max-w-lg mx-auto">
            <div className="mb-4">
              <h1 className="font-bebas text-3xl text-neutral-900 dark:text-white">
                Become a Monthly{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                  Supporter
                </span>
              </h1>
              <p className="text-base text-neutral-500 dark:text-neutral-400 mt-1">
                Everyone gets the same access to unreleased music and behind-the-scenes content, no
                matter your tier.
              </p>
            </div>
            {earlyAccessTracks.length > 0 && (
              <div className="mb-4">
                <div className="text-xs text-neutral-400 uppercase tracking-wider mb-2">
                  {PATRON_CONFIG.earlyAccess.name}
                </div>
                <div className="rounded-xl border-2 border-neutral-200 dark:border-neutral-800 divide-y-2 divide-neutral-200 dark:divide-neutral-800 overflow-hidden">
                  {earlyAccessTracks.map((track) => (
                    <button
                      type="button"
                      key={track.id}
                      onClick={() => {
                        setPreviewTrack({ title: track.title, src: `/audio/${track.id}-preview.mp3` });
                        setShowTierModal(true);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
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
            )}
            <div className="text-center mt-2">
              {!showVerifyForm ? (
                <button
                  onClick={() => setShowVerifyForm(true)}
                  className="inline-block py-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-base underline underline-offset-2"
                >
                  Already a monthly supporter? Sign in
                </button>
              ) : (
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
              )}
            </div>
          </div>
        </section>
      )}

      {children}

      {/* Journey timeline */}
      <section className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ${isPatron ? "pb-8" : "pb-32"}`}>
        <div className="max-w-lg mx-auto">
          <h1 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-4">
            Stacking the Days
          </h1>
          {renderTimeline()}
        </div>
      </section>

      {/* Floating CTA */}
      {!isPatron && showBottomCta && (
        <button
          onClick={() => {
            setPreviewTrack(null);
            setShowTierModal(true);
          }}
          className={`${isModal ? "absolute" : "fixed"} left-1/2 -translate-x-1/2 z-50 ${atBottom ? "px-8 py-4 text-base md:px-10 md:py-5 md:text-lg" : "px-5 py-3 text-sm md:px-8 md:py-4 md:text-base"} cursor-pointer text-white font-medium flex items-center gap-2 md:gap-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95`}
          style={{
            background: "linear-gradient(to right, #f97316, #ec4899)",
            bottom: isModal ? "80px" : "max(80px, var(--player-h, 0px))",
          }}
        >
          <MicrophoneStageIcon
            className={atBottom ? "w-7 h-7 md:w-8 md:h-8" : "w-6 h-6 md:w-7 md:h-7"}
            weight="regular"
          />
          Become a Monthly Supporter
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
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
              >
                <XIcon className="w-4 h-4 text-neutral-500" weight="bold" />
              </button>
            </div>
            <p className="text-neutral-600 dark:text-neutral-300 text-sm leading-relaxed mb-4">
              Naw-Ruz means "new day." As a Baha'i, I celebrate the new year at the vernal equinox,
              the first day of spring.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
