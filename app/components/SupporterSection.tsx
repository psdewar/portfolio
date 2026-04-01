"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { useHydrated } from "../hooks/useHydrated";
import {
  RadioIcon,
  BroadcastIcon,
  XIcon,
  CheckIcon,
  CaretRightIcon,
  CaretDownIcon,
  PlayIcon,
  PauseIcon,
  MicrophoneStageIcon,
  UserIcon,
  ArchiveIcon,
  PencilIcon,
  WavesIcon,
  LightbulbIcon,
  FireIcon,
  DownloadSimpleIcon,
  DiscIcon,
} from "@phosphor-icons/react";

import StayConnected from "./StayConnected";
import { getJourneyEvents, formatEventDate, EventType } from "../data/timeline";
import { TRACK_DATA } from "../data/tracks";
import { TIER_ELEMENTS } from "../data/patron-config";
import { TRACKLIST } from "../shop/shared";
import { useDevTools } from "../contexts/DevToolsContext";
import { useAudio } from "../contexts/AudioContext";
import { formatNextStream } from "../lib/dates";

const TIER_ICONS = [PencilIcon, WavesIcon, LightbulbIcon, FireIcon];
const TIER_COLORS = ["#f97316", "#f56542", "#f0566d", "#ec4899"];

const TIER_NAMES = ["Pen", "Flow", "Mind", "Soul"];
const SUPPORT_AMOUNTS = [5, 10, 25, 50].map((net, i) => {
  const charge = Math.ceil(((net + 0.3) / 0.971) * 100) / 100;
  return { net, charge, chargeCents: Math.round(charge * 100), name: TIER_NAMES[i] };
});

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
}

export function SupporterSection({
  onClose,
  isModal = false,
  forcePatron = false,
}: SupporterSectionProps) {
  const hydrated = useHydrated();
  const { simulatePatron } = useDevTools();
  const { loadTrack, toggle, isPlaying, currentTrack, isLoading: isAudioLoading } = useAudio();
  const [isLoading, setIsLoading] = useState(false);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [isPatron, setIsPatron] = useState(forcePatron);

  const [showCalendarInfo, setShowCalendarInfo] = useState(false);

  const [archiveInfoVisible, setArchiveInfoVisible] = useState(true);

  const [downloadExpanded, setDownloadExpanded] = useState(false);

  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">("monthly");

  const containerRef = useRef<HTMLDivElement>(null);
  const tierSectionRef = useRef<HTMLElement>(null);
  const [showBottomCta, setShowBottomCta] = useState(false);
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const yearRefs = useRef<Map<string, HTMLElement>>(new Map());
  const tierFlashedRef = useRef(false);
  const tierRowsRef = useRef<HTMLDivElement>(null);
  const [nextStreamDate, setNextStreamDate] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/schedule")
      .then((res) => res.json())
      .then((data) => {
        if (data.nextStream) {
          setNextStreamDate(data.nextStream);
        }
      })
      .catch(() => {});
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
    const tierRows = tierRowsRef.current;
    if (!tierRows) return;
    const root = isModal ? containerRef.current : null;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !tierFlashedRef.current) {
          tierFlashedRef.current = true;
          const rows = tierRowsRef.current?.querySelectorAll("button");
          if (!rows) return;
          const cached = Array.from(rows).map((row) => ({
            el: row as HTMLElement,
            children: Array.from(row.querySelectorAll("*")) as HTMLElement[],
            icon: row.querySelector("[data-icon]") as HTMLElement | null,
          }));
          cached.forEach(({ el, children }) => {
            el.style.transition = "background-color 0.3s ease";
            children.forEach((c) => (c.style.transition = "color 0.3s ease"));
          });
          timeouts.push(
            setTimeout(() => {
              cached.forEach(({ el, children }, i) => {
                timeouts.push(
                  setTimeout(() => {
                    el.style.backgroundColor = TIER_COLORS[i];
                    children.forEach((c) => (c.style.color = "white"));
                  }, i * 400),
                );
              });
              const fadeStart = cached.length * 400 + 600;
              cached.forEach(({ el, children, icon }, i) => {
                timeouts.push(
                  setTimeout(
                    () => {
                      el.style.backgroundColor = "";
                      children.forEach((c) => {
                        if (!c.hasAttribute("data-icon")) c.style.color = "";
                      });
                      if (icon) icon.style.color = TIER_COLORS[i];
                    },
                    fadeStart + i * 400,
                  ),
                );
              });
            }, 1000),
          );
        }
      },
      { root, threshold: 1.0 },
    );
    observer.observe(tierRows);
    return () => {
      observer.disconnect();
      timeouts.forEach(clearTimeout);
    };
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

  const proceedToCheckout = async (
    monthlyChargeCents: number,
    period: "monthly" | "annually",
    email?: string,
  ) => {
    setIsLoading(true);

    const monthlyNet = Math.round(monthlyChargeCents * 0.971 - 30);
    const isAnnual = period === "annually";
    const netAmount = isAnnual ? monthlyNet * 10 : monthlyNet;
    const finalAmount = Math.ceil(((netAmount / 100 + 0.3) / 0.971) * 100);
    const interval = isAnnual ? "year" : "month";
    const displayAmount = Math.round(netAmount / 100);

    posthog.capture("patron_checkout_initiated", {
      amount_cents: finalAmount,
      net_amount: netAmount,
      billing_period: period,
      display_amount: displayAmount,
      source: isModal ? "modal" : "page",
    });

    try {
      const response = await fetch("/api/fund-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectTitle: `$${displayAmount}/${interval} - ${period === "annually" ? "Annual" : "Monthly"} Support`,
          projectId: period === "annually" ? "annual-support" : "monthly-support",
          amount: finalAmount,
          interval,
          ...(email && { customerEmail: email }),
        }),
      });

      const { url, error: serverError } = await response.json();

      if (serverError || !url) {
        throw new Error(serverError || "Failed to create checkout");
      }

      window.location.href = url;
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert("There was an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSubscribe = (amountCents: number, period: "monthly" | "annually" = billingPeriod) => {
    const name = localStorage.getItem("liveCommenterName");

    posthog.capture("patron_tier_selected", {
      amount_cents: amountCents,
      billing_period: period,
      is_logged_in: !!name,
      source: isModal ? "modal" : "page",
    });

    if (!name) {
      setPendingAmount(amountCents);
      sessionStorage.setItem("pendingPatronAmount", amountCents.toString());
      sessionStorage.setItem("pendingPatronPeriod", period);
      setShowAuthModal(true);
      return;
    }

    proceedToCheckout(amountCents, period);
  };

  function handleManageSubscription(): void {
    const storedEmail = localStorage.getItem("patronEmail");
    const email = storedEmail || (simulatePatron ? "test@example.com" : null);
    if (email) {
      window.location.href = `/api/stripe-portal?email=${encodeURIComponent(email)}`;
    } else {
      const inputEmail = prompt("Enter the email you used to subscribe:");
      if (inputEmail) {
        localStorage.setItem("patronEmail", inputEmail);
        window.location.href = `/api/stripe-portal?email=${encodeURIComponent(inputEmail)}`;
      }
    }
  }

  const journeyEvents = getJourneyEvents();

  const eventsByYear = journeyEvents.reduce<Record<string, typeof journeyEvents>>((acc, event) => {
    const year = new Date(event.date + "T12:00:00").getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {});

  const years = Object.keys(eventsByYear).sort((a, b) => parseInt(b) - parseInt(a));

  const patienceTrack = TRACK_DATA.find((t) => t.id === "patience");

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
          className="mb-16 last:mb-0"
        >
          <h2
            className={`font-bebas text-[56px] md:text-[80px] leading-none pointer-events-none select-none sticky ${isModal ? "top-0" : "top-16"} backdrop-blur-md bg-neutral-50/80 dark:bg-neutral-950/80 z-10 py-4 transition-colors ${
              isActiveYear
                ? "text-neutral-900 dark:text-neutral-100"
                : "text-neutral-200 dark:text-neutral-800"
            }`}
          >
            {year}
          </h2>

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

              return (
                <div key={event.id} className="flex items-center gap-3 py-3 sm:py-4">
                  <div className="w-12 sm:w-14 shrink-0 flex flex-col items-center">
                    <div className="text-xs uppercase tracking-wide leading-none text-neutral-500">
                      {dateInfo.month}
                    </div>
                    <div className="font-bebas text-3xl sm:text-4xl leading-none text-neutral-900 dark:text-white">
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
                          <span className="text-neutral-500 text-xs sm:text-sm truncate">
                            {event.location}
                          </span>
                        )}
                        {isContent && event.relatedSong && (
                          <span className="text-neutral-500 text-xs sm:text-sm truncate">
                            {event.relatedSong}
                          </span>
                        )}
                        {isFeature && event.artist && (
                          <span className="text-neutral-500 text-xs sm:text-sm truncate flex items-center gap-1">
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
                      <p className="text-neutral-500 dark:text-neutral-400 text-xs sm:text-sm">
                        {event.description}
                      </p>
                    )}
                    {event.url && event.urlLabel && (
                      <Link
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1.5 text-xs sm:text-sm text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
                      >
                        {event.urlLabel}
                      </Link>
                    )}
                  </div>

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
                </div>
              );
            })}
          </div>
        </section>
      );
    });
  }

  function renderArchiveSection(): React.ReactNode {
    return (
      <section className="mt-8 mb-0">
        <div className="flex items-center gap-3 py-3 sm:py-4 bg-neutral-100/50 dark:bg-neutral-900/50 border-y border-neutral-200 dark:border-neutral-800">
          <div className="w-12 sm:w-14 shrink-0 flex items-center justify-center">
            <ArchiveIcon className="w-7 h-7 sm:w-8 sm:h-8 text-neutral-400 dark:text-neutral-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm sm:text-base text-neutral-700 dark:text-neutral-300">
              From The Archives: Exhibit PSD
            </h3>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <div className="grid grid-cols-2">
            <div className="aspect-[9/16] relative bg-neutral-900 overflow-hidden">
              <video
                src="/videos/exhibit-psd-live.mp4"
                className="w-full h-full object-cover"
                controls
                playsInline
                poster="/images/covers/exhibit-psd-live-cover.jpg"
              />
              <div className="absolute top-0 left-0 p-3 pointer-events-none">
                <div className="bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1">
                  <p className="text-white text-sm font-medium">Live with the band at High Dive</p>
                  <p className="text-white/70 text-xs">Gainesville, FL · 2015</p>
                </div>
              </div>
            </div>
            <div className="flex flex-col aspect-[9/16]">
              <div className="flex-1 min-h-0 relative bg-neutral-900 overflow-hidden">
                <img
                  src="/images/merch/lu-psd-merch.JPG"
                  alt="With the homie Ludger"
                  className="w-full h-full object-cover object-bottom"
                />
                <div className="absolute top-0 left-0 p-3">
                  <div className="bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1">
                    <p className="text-white text-sm font-medium">With the homie Ludger</p>
                    <p className="text-white/70 text-xs">Los Angeles, CA · 2018</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 min-h-0 relative bg-neutral-900 overflow-hidden">
                <img
                  src="/images/merch/exhibit-psd-merch.JPG"
                  alt="Exhibit PSD T-Shirt"
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => setArchiveInfoVisible(true)}
                  className={`absolute bottom-0 left-0 p-3 transition-opacity ${archiveInfoVisible ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                >
                  <div className="bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1.5">
                    <p className="text-white/90 text-xs">Shirts available at live shows</p>
                    <span className="font-serif text-xs italic text-white/70">i</span>
                  </div>
                </button>
                <button
                  onClick={() => setArchiveInfoVisible(true)}
                  className={`absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full transition-all z-10 flex items-center justify-center ${archiveInfoVisible ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                  aria-label="Show info"
                >
                  <span className="font-serif text-base italic text-white">i</span>
                </button>
                <div
                  onClick={() => setArchiveInfoVisible(false)}
                  className={`absolute inset-0 bg-black/85 backdrop-blur-sm transform transition-transform duration-300 ease-out z-20 cursor-pointer flex flex-col px-5 py-4 sm:p-5 lg:p-8 overflow-y-auto ${
                    archiveInfoVisible ? "translate-x-0" : "translate-x-full"
                  }`}
                >
                  <h3 className="font-medium text-white text-sm sm:text-base mb-2">Exhibit PSD</h3>
                  <p className="text-white/90 text-xs sm:text-sm leading-relaxed mb-3">
                    Back when I attended the University of Florida, I gave out mixtape CDs and
                    performed at various clubs and venues in downtown Gainesville. During my
                    three-mixtape run from 2013 to when I graduated in 2015, I wrote raps to songs
                    from The xx (Intro), Tinashe (2 On), and Carlos Santana (Maria Maria), recording
                    them on Mixcraft in my apartment room closet. While making my third mixtape, I
                    designed shirts with my initials, my original rap moniker, to share with the
                    music. 100% cotton, still holding up. Can you spot the writing tool in my album
                    artwork?
                  </p>
                  <div className="flex justify-center mt-auto">
                    <span className="text-white/60 text-[10px] sm:text-xs bg-white/10 px-2 sm:px-3 py-1 rounded-full">
                      Tap anywhere to see merch
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
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
          ref={tierSectionRef}
          className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ${isModal ? "pt-0" : "pt-8 md:pt-12"} pb-8 md:pb-12`}
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
                I write and record every bar myself, and even built this site from scratch. Monthly
                supporters fund my music directly and get early access to unreleased tracks, live
                streams, and updates. Everyone gets full access, so give what you can!
              </p>
            </div>
            <div className="flex items-center justify-center mb-4 text-base">
              <button
                onClick={() =>
                  setBillingPeriod(billingPeriod === "monthly" ? "annually" : "monthly")
                }
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors py-2 inline-flex items-center gap-2"
              >
                <span
                  className={`relative w-12 h-7 rounded-full transition-colors ${
                    billingPeriod === "annually"
                      ? "bg-orange-500"
                      : "bg-neutral-300 dark:bg-neutral-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm flex items-center justify-center transition-all ${
                      billingPeriod === "annually" ? "left-[22px]" : "left-0.5"
                    }`}
                  >
                    {billingPeriod === "annually" && (
                      <CheckIcon size={16} weight="bold" className="text-orange-500" />
                    )}
                  </span>
                </span>
                <span className="leading-none">Pay annually</span>
                <span className="text-green-600 dark:text-green-500">(2 months free)</span>
              </button>
            </div>
            <div
              ref={tierRowsRef}
              className="-mx-4 sm:mx-0 sm:rounded-xl border-y-2 sm:border-x-2 border-neutral-200 dark:border-neutral-800 divide-y-2 divide-neutral-200 dark:divide-neutral-800 sm:overflow-hidden"
            >
              {SUPPORT_AMOUNTS.map((tier, index) => {
                const TierIcon = TIER_ICONS[index];
                const price = billingPeriod === "annually" ? tier.net * 10 : tier.net;
                const period = billingPeriod === "annually" ? "yr" : "mo";
                return (
                  <button
                    key={tier.name}
                    onClick={() => handleSubscribe(tier.chargeCents)}
                    disabled={isLoading || !hydrated}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors group text-left"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = TIER_COLORS[index];
                      e.currentTarget
                        .querySelectorAll("*")
                        .forEach((el) => ((el as HTMLElement).style.color = "white"));
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "";
                      e.currentTarget.querySelectorAll("*").forEach((el) => {
                        if (!el.hasAttribute("data-icon")) (el as HTMLElement).style.color = "";
                      });
                      const icon = e.currentTarget.querySelector("[data-icon]") as HTMLElement;
                      if (icon) icon.style.color = TIER_COLORS[index];
                    }}
                  >
                    <TierIcon
                      data-icon
                      size={44}
                      weight="regular"
                      style={{ color: TIER_COLORS[index] }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-neutral-900 dark:text-white font-medium text-xl">
                        {tier.name}
                      </span>
                      <div className="text-neutral-500 dark:text-neutral-400 text-sm">
                        {TIER_ELEMENTS[tier.name]}
                      </div>
                    </div>
                    <span className="text-neutral-900 dark:text-white font-medium text-4xl shrink-0 tabular-nums ml-auto">
                      {isLoading ? (
                        <span className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-900 dark:border-t-white rounded-full animate-spin inline-block" />
                      ) : (
                        <>
                          ${price}
                          <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
                            /{period}
                          </span>
                        </>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="text-center mt-6 md:mt-8">
              {!showVerifyForm ? (
                <button
                  onClick={() => setShowVerifyForm(true)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-base underline underline-offset-2"
                >
                  Already a monthly supporter? Log in
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
                      className="flex-1 py-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-base"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerifyPatron}
                      disabled={verifyLoading || !verifyEmail.trim()}
                      className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-base rounded-lg font-medium"
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

      {/* Journey timeline */}
      {!isPatron && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-48">
          <div className="max-w-lg mx-auto">
            <h1 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-4">
              Stacking the Days
            </h1>
            {renderTimeline()}
            {renderArchiveSection()}
          </div>
        </section>
      )}

      {/* Patron header (active subscribers) */}
      {isPatron && (
        <section
          className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 ${isModal ? "pt-0" : "pt-8"} pb-4`}
        >
          <button
            onClick={handleManageSubscription}
            className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-sm lg:text-base underline underline-offset-2 cursor-pointer mb-4"
          >
            Manage subscription
          </button>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            <Link
              href="/listen"
              className="flex items-center justify-between p-4 lg:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <RadioIcon
                  className="w-7 h-7 lg:w-8 lg:h-8 text-neutral-600 dark:text-neutral-400"
                  weight="duotone"
                />
                <div className="flex flex-col">
                  <span className="text-neutral-900 dark:text-white font-medium text-base lg:text-lg">
                    Listen
                  </span>
                  <span className="text-neutral-500 text-xs lg:text-sm font-medium">
                    Unreleased Music
                  </span>
                </div>
              </div>
              <CaretRightIcon
                className="w-5 h-5 text-neutral-400 group-hover:translate-x-1 transition-transform"
                weight="bold"
              />
            </Link>

            <div className="relative">
              <button
                onClick={() => setDownloadExpanded(!downloadExpanded)}
                className={`w-full flex items-center justify-between p-4 lg:p-5 border border-blue-500/30 hover:border-blue-500 bg-blue-500/5 hover:bg-blue-500/10 transition-all group ${downloadExpanded ? "rounded-t-xl" : "rounded-xl"}`}
              >
                <div className="flex items-center gap-3">
                  <DiscIcon className="w-7 h-7 lg:w-8 lg:h-8 text-blue-500" weight="duotone" />
                  <div className="flex flex-col text-left">
                    <span className="text-blue-600 dark:text-blue-400 font-medium text-base lg:text-lg">
                      Singles & 16s 2025
                    </span>
                    <span className="text-blue-500/70 text-xs lg:text-sm font-medium">
                      6 tracks + lyricbook
                    </span>
                  </div>
                </div>
                <CaretDownIcon
                  className={`w-5 h-5 text-blue-500 transition-transform duration-200 ${downloadExpanded ? "rotate-180" : ""}`}
                  weight="bold"
                />
              </button>
              {downloadExpanded && (
                <div className="absolute top-full left-0 right-0 z-20">
                  <div className="bg-[#111D7A] rounded-b-xl p-4 lg:p-5 shadow-xl">
                    <a
                      href="/api/patron-download?file=singles-16s-2025"
                      download="peyt-spencer-singles-and-16s-2025.zip"
                      className="flex items-center justify-center gap-2 w-full py-3 lg:py-4 bg-white/10 hover:bg-white/20 rounded-lg text-white font-medium transition-colors mb-4"
                    >
                      <DownloadSimpleIcon className="w-5 h-5" weight="bold" />
                      Download ZIP
                    </a>
                    <div className="space-y-1">
                      {TRACKLIST.map((track) => (
                        <div
                          key={track.name}
                          className="py-2.5 pl-4 pr-3 border-l-2 border-white/40 hover:border-white hover:bg-white/5 transition-all flex items-center justify-between"
                        >
                          <span className="font-bebas text-white text-xl lg:text-2xl">
                            {track.name}
                          </span>
                          <span className="font-mono text-white/70 text-base lg:text-lg">
                            {track.duration}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <Link
              href="/live"
              className="flex items-center justify-between p-4 lg:p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/50 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 transition-all group"
            >
              <div className="flex items-center gap-3">
                <BroadcastIcon
                  className="w-7 h-7 lg:w-8 lg:h-8 text-neutral-600 dark:text-neutral-400"
                  weight="duotone"
                />
                <div className="flex flex-col">
                  <span className="text-neutral-900 dark:text-white font-medium text-base lg:text-lg">
                    Live
                  </span>
                  <span className="text-neutral-500 text-xs lg:text-sm font-medium">
                    {nextStreamDate ? formatNextStream(nextStreamDate) : "Next Live"}
                  </span>
                </div>
              </div>
              <CaretRightIcon
                className="w-5 h-5 text-neutral-400 group-hover:translate-x-1 transition-transform"
                weight="bold"
              />
            </Link>
          </div>
        </section>
      )}

      {/* Journey timeline (patrons see standalone full-width) */}
      {isPatron && (
        <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <h1 className="font-bebas text-3xl text-neutral-900 dark:text-white mb-4">
            Stacking the Days
          </h1>
          {renderTimeline()}
          {renderArchiveSection()}
        </section>
      )}

      {/* Floating CTA */}
      {!isPatron && showBottomCta && (
        <button
          onClick={() => tierSectionRef.current?.scrollIntoView({ behavior: "smooth" })}
          className={`${isModal ? "absolute" : "fixed"} bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 md:px-8 md:py-4 cursor-pointer text-white font-medium text-sm md:text-base flex items-center gap-2 md:gap-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95`}
          style={{ background: "linear-gradient(to right, #f97316, #ec4899)" }}
        >
          <MicrophoneStageIcon className="w-6 h-6 md:w-7 md:h-7" weight="regular" />
          Support the music
        </button>
      )}

      {/* Auth Modal */}
      {showAuthModal &&
        (() => {
          const tier = SUPPORT_AMOUNTS.find((t) => t.chargeCents === pendingAmount);
          const savedPeriod = sessionStorage.getItem("pendingPatronPeriod") as
            | "monthly"
            | "annually"
            | null;
          const period = savedPeriod || billingPeriod;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <StayConnected
                isModal
                selectedTier={
                  tier
                    ? {
                        name: tier.name,
                        amount: period === "annually" ? tier.net * 10 : tier.net,
                        period,
                      }
                    : undefined
                }
                onClose={(email) => {
                  setShowAuthModal(false);
                  const name = localStorage.getItem("liveCommenterName");
                  if (name) {
                    const savedAmount = sessionStorage.getItem("pendingPatronAmount");
                    const savedPeriod = sessionStorage.getItem("pendingPatronPeriod") as
                      | "monthly"
                      | "annually"
                      | null;
                    const amount =
                      pendingAmount || (savedAmount ? parseInt(savedAmount, 10) : null);
                    if (amount) {
                      sessionStorage.removeItem("pendingPatronAmount");
                      sessionStorage.removeItem("pendingPatronPeriod");
                      setPendingAmount(null);
                      proceedToCheckout(amount, savedPeriod || billingPeriod, email);
                      return;
                    }
                  }
                  setPendingAmount(null);
                  sessionStorage.removeItem("pendingPatronAmount");
                  sessionStorage.removeItem("pendingPatronPeriod");
                }}
                shouldShow={true}
              />
            </div>
          );
        })()}

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
