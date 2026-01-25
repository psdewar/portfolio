"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import posthog from "posthog-js";
import { useHydrated } from "../hooks/useHydrated";
import {
  RadioIcon,
  BroadcastIcon,
  ArrowLeftIcon,
  XIcon,
  CheckIcon,
  CaretRightIcon,
  CaretLeftIcon,
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

const TIER_ICONS = [PencilIcon, WavesIcon, LightbulbIcon, FireIcon];
import StayConnected from "./StayConnected";
import { getJourneyEvents, formatEventDate, EventType } from "../data/timeline";
import { TRACK_DATA } from "../data/tracks";
import { PATRON_CONFIG } from "../data/patron-config";
import { TRACKLIST } from "../shop/shared";
import { useDevTools } from "../contexts/DevToolsContext";
import { useAudio } from "../contexts/AudioContext";
import { formatNextStream } from "../lib/dates";

const TIER_NAMES = ["Pen", "Flow", "Mind", "Soul"];
const SUPPORT_AMOUNTS = [5, 10, 25, 100].map((net, i) => {
  const charge = Math.ceil(((net + 0.3) / 0.971) * 100) / 100;
  return { net, charge, chargeCents: Math.round(charge * 100), name: TIER_NAMES[i] };
});

const TOTAL_CARDS = SUPPORT_AMOUNTS.length;

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

type ViewMode = "patron" | "journey";

interface PatronContentProps {
  /** Called when user wants to close/go back (modal context) */
  onClose?: () => void;
  /** Adjusts behavior for modal context */
  isModal?: boolean;
  /** Starting view mode */
  initialViewMode?: ViewMode;
  /** Force patron status (for dev tools) */
  forcePatron?: boolean;
}

export function PatronContent({
  onClose,
  isModal = false,
  initialViewMode = "patron",
  forcePatron = false,
}: PatronContentProps) {
  const hydrated = useHydrated();
  const { simulatePatron } = useDevTools();
  const { loadTrack, toggle, isPlaying, currentTrack, isLoading: isAudioLoading } = useAudio();
  const [isLoading, setIsLoading] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [isPatron, setIsPatron] = useState(forcePatron);

  // View mode: patron tiers or journey
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  // Calendar info popup state
  const [showCalendarInfo, setShowCalendarInfo] = useState(false);

  // Archive section expanded state
  const [archiveExpanded, setArchiveExpanded] = useState(true);
  const [archiveInfoVisible, setArchiveInfoVisible] = useState(true);

  // Download section expanded state
  const [downloadExpanded, setDownloadExpanded] = useState(false);

  // Already a patron verification
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Billing period: monthly or annually
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">("monthly");

  // Discrete scroll with animation
  const currentIndexRef = useRef(0);

  const journeyScrollRef = useRef<HTMLDivElement>(null);
  const topCtaRef = useRef<HTMLButtonElement>(null);
  const archiveSectionRef = useRef<HTMLElement>(null);
  const [showBottomCta, setShowBottomCta] = useState(false);
  const [activeYear, setActiveYear] = useState<string | null>(null);
  const yearRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [nextStreamDate, setNextStreamDate] = useState<string | null>(null);

  // Fetch next stream date
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

  // Check if user is a patron (requires both status and email)
  useEffect(() => {
    const patronStatus = localStorage.getItem("patronStatus");
    const patronEmail = localStorage.getItem("patronEmail");
    if (forcePatron) {
      setIsPatron(true);
      if (initialViewMode === "patron") {
        setViewMode("journey");
      }
    } else if (patronStatus === "active" && patronEmail) {
      setIsPatron(true);
      if (initialViewMode === "patron") {
        setViewMode("journey");
      }
    } else if (patronStatus === "active" && !patronEmail) {
      // Invalid state - clear patron status
      localStorage.removeItem("patronStatus");
    }
  }, [forcePatron, initialViewMode]);

  // Track page view (only for page context)
  useEffect(() => {
    if (!isModal) {
      posthog.capture("patron_page_viewed", {
        is_patron: isPatron,
        view_mode: viewMode,
      });
    }
  }, []);

  // Dev tools: simulate patron
  useEffect(() => {
    if (simulatePatron) {
      setIsPatron(true);
      setViewMode("journey");
    }
  }, [simulatePatron]);

  // Hide bottom CTA when top CTA is visible
  useEffect(() => {
    if (viewMode !== "journey" || isPatron) return;

    const topCta = topCtaRef.current;
    const scrollContainer = journeyScrollRef.current;
    if (!topCta || !scrollContainer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowBottomCta(!entry.isIntersecting);
      },
      { root: scrollContainer, threshold: 0 },
    );

    observer.observe(topCta);
    return () => observer.disconnect();
  }, [viewMode, isPatron]);

  // Track which year section is currently in view
  useEffect(() => {
    if (viewMode !== "journey") return;

    const scrollContainer = journeyScrollRef.current;
    if (!scrollContainer) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const year = entry.target.getAttribute("data-year");
            if (year) setActiveYear(year);
          }
        });
      },
      { root: scrollContainer, rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    yearRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [viewMode]);

  const updateCardStyles = () => {
    const container = scrollRef.current;
    if (!container) return;

    const cards = container.querySelectorAll<HTMLElement>("[data-card]");
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2;

    cards.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      const cardCenterX = cardRect.left + cardRect.width / 2;
      const distance = Math.abs(centerX - cardCenterX);
      const cardWidth = cardRect.width + 24;
      const normalizedDistance = Math.min(distance / cardWidth, 2);

      const scale = Math.max(0.85, 1 - normalizedDistance * 0.15);
      const opacity = Math.max(0.5, 1 - normalizedDistance * 0.25);

      card.style.transform = `scale(${scale})`;
      card.style.opacity = String(opacity);
    });
  };

  useEffect(() => {
    if (viewMode !== "patron") return;

    const container = scrollRef.current;
    if (!container || initializedRef.current) return;

    const cards = container.querySelectorAll<HTMLElement>("[data-card]");
    currentIndexRef.current = Math.floor(cards.length / 3) + 2;
    const targetCard = cards[currentIndexRef.current];

    if (targetCard) {
      container.scrollLeft =
        targetCard.offsetLeft - (container.clientWidth - targetCard.offsetWidth) / 2;
    }

    initializedRef.current = true;
    setActiveCardIndex(2);
    updateCardStyles();
  }, [viewMode]);

  const animateToIndex = useCallback((index: number) => {
    const container = scrollRef.current;
    if (!container) return;

    const cards = container.querySelectorAll<HTMLElement>("[data-card]");
    const totalCards = cards.length;
    const singleSetCount = totalCards / 3;

    const targetCard = cards[index];
    if (!targetCard) return;

    currentIndexRef.current = index;
    const targetScroll =
      targetCard.offsetLeft - (container.clientWidth - targetCard.offsetWidth) / 2;
    const startScroll = container.scrollLeft;
    const distance = targetScroll - startScroll;
    const duration = 350;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2.5);

      container.scrollLeft = startScroll + distance * eased;
      updateCardStyles();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        let finalIndex = index;
        if (index < singleSetCount || index >= singleSetCount * 2) {
          const middleIndex =
            index < singleSetCount ? index + singleSetCount : index - singleSetCount;
          const equivalentCard = cards[middleIndex];
          const offset = Math.abs(equivalentCard.offsetLeft - targetCard.offsetLeft);

          cards.forEach((card) => (card.style.transition = "none"));
          container.scrollLeft += index < singleSetCount ? offset : -offset;
          updateCardStyles();
          void container.offsetHeight;
          cards.forEach((card) => {
            card.style.transition =
              "transform 150ms ease-out, opacity 150ms ease-out, border-color 200ms, background-color 200ms";
          });

          finalIndex = middleIndex;
        }

        currentIndexRef.current = finalIndex;
        setActiveCardIndex(finalIndex % singleSetCount);
      }
    };

    requestAnimationFrame(animate);
  }, []);

  // Wheel handler
  useEffect(() => {
    if (viewMode !== "patron") return;

    let lastTriggerTime = 0;

    const handleWheel = (e: WheelEvent) => {
      const container = scrollRef.current;
      if (!container) return;

      e.preventDefault();

      const now = performance.now();
      const delta = e.deltaY + e.deltaX;

      if (now - lastTriggerTime < 300) return;

      if (Math.abs(delta) >= 20) {
        lastTriggerTime = now;
        animateToIndex(currentIndexRef.current + (delta > 0 ? 1 : -1));
      }
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [animateToIndex, viewMode]);

  // Touch/swipe support for mobile
  useEffect(() => {
    if (viewMode !== "patron") return;

    const container = scrollRef.current;
    if (!container) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let isSwiping = false;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      isSwiping = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const deltaX = e.touches[0].clientX - touchStartX;
      const deltaY = e.touches[0].clientY - touchStartY;

      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        isSwiping = true;
        e.preventDefault();
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isSwiping) return;

      const deltaX = e.changedTouches[0].clientX - touchStartX;
      const threshold = 50;

      if (Math.abs(deltaX) >= threshold) {
        animateToIndex(currentIndexRef.current + (deltaX < 0 ? 1 : -1));
      }
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: true });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
  }, [animateToIndex, viewMode]);

  const proceedToCheckout = async (monthlyChargeCents: number, period: "monthly" | "annually") => {
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
        setViewMode("journey");
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

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(updateCardStyles);
  }, []);

  const handleViewModeChange = (newMode: ViewMode) => {
    setViewMode(newMode);
    if (!isModal) {
      window.history.replaceState(
        {},
        "",
        newMode === "journey" ? "/patron?view=journey" : "/patron",
      );
    }
  };

  const handleBackClick = () => {
    if (viewMode === "journey") {
      handleViewModeChange("patron");
    } else if (onClose) {
      onClose();
    }
  };

  // Journey timeline data
  const journeyEvents = getJourneyEvents();

  const eventsByYear = journeyEvents.reduce<Record<string, typeof journeyEvents>>((acc, event) => {
    const year = new Date(event.date + "T12:00:00").getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(event);
    return acc;
  }, {});

  const years = Object.keys(eventsByYear).sort((a, b) => parseInt(b) - parseInt(a));

  const showCount = journeyEvents.filter((e) => e.type === "show").length;
  const releaseCount = journeyEvents.filter(
    (e) =>
      e.type === "single" ||
      e.type === "feature" ||
      (e.type === "content" && e.relatedSong?.includes("Freestyle")),
  ).length;

  return (
    <div className="h-full bg-neutral-50 dark:bg-neutral-950 overflow-hidden relative">
      {/* Modal header with close button */}
      {isModal && (
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 sm:p-6">
          <button
            onClick={handleBackClick}
            className="flex items-center gap-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeftIcon size={20} weight="bold" />
            <span className="text-sm font-medium">Back</span>
          </button>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
          >
            <XIcon size={20} weight="bold" className="text-neutral-500" />
          </button>
        </div>
      )}

      {/* Horizontal sliding container - only for non-patrons */}
      {!isPatron ? (
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: viewMode === "journey" ? "translateX(-100%)" : "translateX(0)" }}
        >
          {/* Left: Patron View */}
          <main className="w-full h-full shrink-0 flex flex-col items-center justify-center">
            <section className={`text-center mb-6 px-8 ${isModal ? "pt-16" : ""}`}>
              <h1 className="font-bebas text-[40px] md:text-[64px] leading-none">
                <span className="text-neutral-900 dark:text-white">BECOME MY</span>{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-pink-500">
                  PATRON
                </span>
              </h1>
              <div className="flex items-center justify-center gap-4 mt-3 md:mt-4 text-base md:text-lg">
                <button
                  onClick={() =>
                    setBillingPeriod(billingPeriod === "monthly" ? "annually" : "monthly")
                  }
                  className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors py-3 inline-flex items-center gap-2 md:gap-3"
                >
                  <span
                    className={`relative w-12 h-7 md:w-14 md:h-8 rounded-full transition-colors ${
                      billingPeriod === "annually"
                        ? "bg-orange-500"
                        : "bg-neutral-300 dark:bg-neutral-700"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-6 h-6 md:w-7 md:h-7 rounded-full bg-white shadow-sm flex items-center justify-center transition-all ${
                        billingPeriod === "annually" ? "left-[22px] md:left-[26px]" : "left-0.5"
                      }`}
                    >
                      {billingPeriod === "annually" && (
                        <CheckIcon size={16} weight="bold" className="text-orange-500" />
                      )}
                    </span>
                  </span>
                  <span className="leading-none">Pay annually</span>
                  <span className="text-green-600 dark:text-green-500 text-sm md:text-base">
                    (2 months free)
                  </span>
                </button>
                <span className="hidden sm:inline text-neutral-400 dark:text-neutral-600">·</span>
                <span className="hidden sm:inline text-neutral-500 dark:text-neutral-500 leading-none">
                  Give what feels right
                </span>
              </div>
            </section>

            <div
              ref={scrollRef}
              onScroll={handleScroll}
              className="w-full flex overflow-x-auto scrollbar-hide px-8 sm:px-[calc((100vw-320px)/2)] md:px-[calc((100vw-400px)/2)] touch-pan-y"
            >
              {[0, 1, 2].map((setIndex) => (
                <div key={setIndex} className="flex shrink-0">
                  {SUPPORT_AMOUNTS.map((tier, index) => {
                    const isActive = index === activeCardIndex;
                    const TierIcon = TIER_ICONS[index];
                    return (
                      <div
                        key={`${setIndex}-${tier.net}`}
                        data-card
                        onClick={() => handleSubscribe(tier.chargeCents)}
                        className="shrink-0 w-[300px] sm:w-[320px] md:w-[400px] mx-2 sm:mx-3 p-6 sm:p-8 md:p-10 rounded-2xl border-2 border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-[border-color,background-color] duration-200 cursor-pointer hover:border-orange-500/50 active:border-orange-500/50 hover:bg-neutral-50 dark:hover:bg-neutral-800 active:bg-neutral-50 dark:active:bg-neutral-800"
                        style={{
                          transition:
                            "transform 150ms ease-out, opacity 150ms ease-out, border-color 200ms, background-color 200ms",
                          willChange: "transform, opacity",
                        }}
                      >
                        <div className="text-[16px] md:text-[20px] font-medium text-orange-500 mb-3 uppercase tracking-wide flex items-center gap-2">
                          <TierIcon size={24} weight="regular" />
                          {tier.name}
                        </div>
                        <div className="flex items-baseline gap-1 mb-6">
                          <span className="text-[64px] md:text-[88px] font-bold text-neutral-900 dark:text-white leading-none tabular-nums">
                            ${billingPeriod === "annually" ? tier.net * 10 : tier.net}
                          </span>
                          <span className="text-[22px] md:text-[28px] text-neutral-500">
                            /{billingPeriod === "annually" ? "year" : "month"}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubscribe(tier.chargeCents);
                          }}
                          disabled={isLoading || !hydrated}
                          data-hydrated={hydrated}
                          className="w-full py-4 md:py-5 text-white text-[18px] md:text-[22px] font-medium rounded-xl transition-all mb-5 flex items-center justify-center disabled:opacity-50"
                          style={{
                            background: "linear-gradient(to right, #f97316, #ec4899)",
                            backgroundSize: `${TOTAL_CARDS * 100}% 100%`,
                            backgroundPosition: `${(index / (TOTAL_CARDS - 1)) * 100}% 0`,
                          }}
                        >
                          {isLoading ? (
                            <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            "Join"
                          )}
                        </button>
                        <p className="text-[16px] md:text-[18px] text-neutral-400 leading-relaxed">
                          Your support funds new music, tours, livestreaming, and creative projects.
                          Thank you for being part of my journey.
                        </p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <div className="text-center mt-8 space-y-4">
              <button
                onClick={() => handleViewModeChange("journey")}
                className="w-full max-w-md mx-auto text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 active:bg-neutral-200 dark:active:bg-neutral-800 transition-colors text-base md:text-lg py-4 px-6 rounded-xl flex items-center justify-center gap-2"
              >
                <span className="leading-none">
                  {showCount} shows, {releaseCount} releases since Naw-Ruz 2025
                </span>
                <CaretRightIcon size={20} weight="bold" className="shrink-0" />
              </button>

              {!showVerifyForm ? (
                <button
                  onClick={() => setShowVerifyForm(true)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 text-sm underline underline-offset-2"
                >
                  Already a patron?
                </button>
              ) : (
                <div className="max-w-sm mx-auto space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={verifyEmail}
                    onChange={(e) => setVerifyEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyPatron()}
                    className="w-full px-4 py-3 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {verifyError && <p className="text-red-500 text-sm">{verifyError}</p>}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowVerifyForm(false);
                        setVerifyEmail("");
                        setVerifyError("");
                      }}
                      className="flex-1 py-2 text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVerifyPatron}
                      disabled={verifyLoading || !verifyEmail.trim()}
                      className="flex-1 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-sm rounded-lg font-medium"
                    >
                      {verifyLoading ? "Checking..." : "Verify"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </main>

          {/* Right: Journey View */}
          <main className="w-full h-full shrink-0 flex flex-col relative">
            <div
              ref={journeyScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none scrollbar-hide"
            >
              <div
                className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 ${isPatron ? "pt-8 pb-20" : isModal ? "pt-20 pb-32" : "pt-2 pb-32"}`}
              >
                {/* Back/Manage button */}
                {isPatron ? (
                  <button
                    ref={topCtaRef}
                    onClick={() => {
                      const email =
                        localStorage.getItem("patronEmail") ||
                        (simulatePatron ? "test@example.com" : null);
                      if (email) {
                        window.location.href = `/api/stripe-portal?email=${encodeURIComponent(email)}`;
                      }
                    }}
                    className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white text-sm lg:text-base underline underline-offset-2 cursor-pointer mb-4"
                  >
                    Manage subscription
                  </button>
                ) : (
                  <button
                    ref={topCtaRef}
                    onClick={() => handleViewModeChange("patron")}
                    className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors text-sm flex items-center gap-2 py-4 cursor-pointer mb-4"
                  >
                    <CaretLeftIcon size={16} weight="bold" />
                    Become my patron
                  </button>
                )}

                {/* Early Access for patrons */}
                {isPatron && (
                  <Link
                    href="/listen"
                    className="flex items-center justify-between p-4 lg:p-5 mb-8 rounded-xl border border-orange-500/30 hover:border-orange-500 bg-orange-500/5 hover:bg-orange-500/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <RadioIcon
                        className="w-7 h-7 lg:w-8 lg:h-8 text-orange-500"
                        weight="duotone"
                      />
                      <span className="text-orange-600 dark:text-orange-400 font-medium text-lg lg:text-xl">
                        {PATRON_CONFIG.earlyAccess.name}
                      </span>
                    </div>
                    <CaretRightIcon
                      size={24}
                      weight="bold"
                      className="text-orange-500 group-hover:translate-x-1 transition-transform"
                    />
                  </Link>
                )}

                <div className="mb-8">
                  <h1 className="font-bebas text-[48px] sm:text-[64px] md:text-[80px] text-neutral-900 dark:text-white leading-none">
                    Stacking the Days
                  </h1>
                </div>

                {years.map((year) => {
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
                        className={`font-bebas text-[80px] md:text-[120px] leading-none pointer-events-none select-none mb-2 sticky top-0 backdrop-blur-md bg-neutral-50/80 dark:bg-neutral-950/80 z-10 py-2 transition-colors ${
                          isActiveYear
                            ? "text-neutral-400 dark:text-neutral-500"
                            : "text-neutral-200 dark:text-neutral-800"
                        }`}
                      >
                        {year}
                      </h2>

                      <div className="space-y-3 lg:space-y-4">
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
                                  className="w-full flex items-center gap-3 sm:gap-4 lg:gap-5 p-4 sm:p-5 lg:p-6 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors text-left group"
                                >
                                  <div className="w-14 sm:w-16 lg:w-20 shrink-0 flex flex-col items-center">
                                    <div className="text-sm lg:text-base uppercase tracking-wide leading-none text-neutral-500">
                                      {dateInfo.month}
                                    </div>
                                    <div className="font-bebas text-4xl sm:text-5xl lg:text-6xl leading-none text-neutral-400 dark:text-neutral-500">
                                      {dateInfo.day}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bebas text-xl sm:text-2xl lg:text-3xl leading-none text-neutral-700 dark:text-neutral-300">
                                      {event.title}
                                    </h3>
                                  </div>
                                  <div className="shrink-0 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center font-serif text-sm lg:text-base italic text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors">
                                    i
                                  </div>
                                </button>
                              </div>
                            );
                          }

                          const patienceTrack = TRACK_DATA.find((t) => t.id === "patience");
                          const isPatience =
                            isSingle && event.title === "Patience" && patienceTrack;
                          const isPatiencePlaying =
                            isPatience && isPlaying && currentTrack?.id === "patience";

                          return (
                            <div
                              key={event.id}
                              className={`flex items-center gap-3 sm:gap-4 lg:gap-5 p-3 sm:p-4 lg:p-5 border ${
                                isPatience ? "rounded-l-xl" : "rounded-xl"
                              } ${
                                isMusic
                                  ? "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-700/50 shadow-sm shadow-amber-500/10"
                                  : "bg-white dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800"
                              }`}
                            >
                              <div className="w-14 sm:w-16 lg:w-20 shrink-0 flex flex-col items-center">
                                <div
                                  className={`text-sm lg:text-base uppercase tracking-wide leading-none ${isMusic ? "text-amber-600 dark:text-amber-400" : "text-neutral-500"}`}
                                >
                                  {dateInfo.month}
                                </div>
                                <div
                                  className={`font-bebas text-4xl sm:text-5xl lg:text-6xl leading-none ${isMusic ? "text-amber-700 dark:text-amber-300" : "text-neutral-900 dark:text-white"}`}
                                >
                                  {dateInfo.day}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                {style && (
                                  <div className="flex items-center gap-2 lg:gap-3">
                                    <span
                                      className={`px-2 lg:px-3 py-0.5 lg:py-1 rounded text-xs lg:text-sm font-medium ${style.bg} ${style.text}`}
                                    >
                                      {style.label}
                                    </span>
                                    {event.location && (
                                      <span className="text-neutral-500 text-sm lg:text-base truncate">
                                        {event.location}
                                      </span>
                                    )}
                                    {isContent && event.relatedSong && (
                                      <span className="text-neutral-500 text-sm lg:text-base truncate">
                                        {event.relatedSong}
                                      </span>
                                    )}
                                    {isFeature && event.artist && (
                                      <span className="text-neutral-500 text-sm lg:text-base truncate flex items-center gap-1">
                                        <UserIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                                        {event.artist}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <h3
                                  className={`font-bebas leading-none ${style ? "mt-2.5 lg:mt-3" : ""} mb-0.5 ${isMusic ? "text-2xl sm:text-3xl lg:text-4xl text-amber-800 dark:text-amber-200" : "text-xl sm:text-2xl lg:text-3xl text-neutral-900 dark:text-white"}`}
                                >
                                  {event.title}
                                </h3>
                                {event.description && (
                                  <p className="text-neutral-500 dark:text-neutral-400 text-sm lg:text-base">
                                    {event.description}
                                  </p>
                                )}
                                {event.url && event.urlLabel && (
                                  <Link
                                    href={event.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-2 text-sm lg:text-base text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
                                  >
                                    {event.urlLabel}
                                  </Link>
                                )}
                              </div>

                              {isPatience &&
                                patienceTrack &&
                                (() => {
                                  const isPatienceLoading =
                                    isAudioLoading && currentTrack?.id === "patience";
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
                                      className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 -my-3 sm:-my-4 lg:-my-5 -mr-3 sm:-mr-4 lg:-mr-5 overflow-hidden relative group"
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
                                    </button>
                                  );
                                })()}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}

                {/* From The Archives - expandable section */}
                <section ref={archiveSectionRef} className="mt-8 mb-16">
                  <button
                    onClick={() => {
                      const willExpand = !archiveExpanded;
                      setArchiveExpanded(willExpand);
                      if (willExpand && archiveSectionRef.current) {
                        setTimeout(() => {
                          archiveSectionRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }, 50);
                      }
                    }}
                    className={`w-full flex items-center gap-3 sm:gap-4 lg:gap-5 p-4 sm:p-5 lg:p-6 bg-neutral-100/50 dark:bg-neutral-900/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors text-left group ${archiveExpanded ? "rounded-t-xl" : "rounded-xl"}`}
                  >
                    <div className="w-14 sm:w-16 lg:w-20 shrink-0 flex items-center justify-center">
                      <ArchiveIcon className="w-8 h-8 lg:w-10 lg:h-10 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bebas text-xl sm:text-2xl lg:text-3xl leading-none text-neutral-700 dark:text-neutral-300">
                        From The Archives: Exhibit PSD
                      </h3>
                    </div>
                    <CaretDownIcon
                      className={`w-5 h-5 lg:w-6 lg:h-6 text-neutral-400 transition-transform duration-200 ${
                        archiveExpanded ? "rotate-180" : ""
                      }`}
                      weight="bold"
                    />
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      archiveExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="relative rounded-b-xl overflow-hidden">
                        <div className="flex flex-col-reverse sm:flex-row">
                          {/* Video - last on mobile, left on desktop */}
                          <div className="aspect-[9/16] sm:w-1/2 relative bg-neutral-900 shrink-0">
                            <video
                              src="/videos/exhibit-psd-live.mp4"
                              className="w-full h-full object-cover"
                              controls
                              playsInline
                              poster="/images/covers/exhibit-psd-live-cover.jpg"
                            />
                            <div className="absolute top-0 left-0 p-3 pointer-events-none">
                              <div className="bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1">
                                <p className="text-white text-sm font-medium">
                                  Live with the band at High Dive
                                </p>
                                <p className="text-white/70 text-xs">Gainesville, FL · 2015</p>
                              </div>
                            </div>
                          </div>
                          {/* Right column - first on mobile, right on desktop */}
                          <div className="sm:w-1/2 flex flex-col-reverse sm:flex-col">
                            {/* Ludger - second on mobile, top on desktop */}
                            <div className="aspect-[4/3] sm:aspect-auto sm:flex-[1] relative bg-neutral-900">
                              <img
                                src="/images/merch/lu-psd-merch.JPG"
                                alt="With the homie Ludger"
                                className="w-full h-full object-cover object-bottom"
                              />
                              <div className="absolute top-0 left-0 p-3">
                                <div className="bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1">
                                  <p className="text-white text-sm font-medium">
                                    With the homie Ludger
                                  </p>
                                  <p className="text-white/70 text-xs">Los Angeles, CA · 2018</p>
                                </div>
                              </div>
                            </div>
                            {/* Right bottom: Shirt - 2/3 height */}
                            <div className="aspect-square sm:aspect-auto sm:flex-[2] relative bg-neutral-900">
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
                                  <p className="text-white/90 text-xs">
                                    Shirts available at live shows
                                  </p>
                                  <span className="font-serif text-xs italic text-white/70">i</span>
                                </div>
                              </button>
                              {/* Info button - shows when panel is hidden */}
                              <button
                                onClick={() => setArchiveInfoVisible(true)}
                                className={`absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full transition-all z-10 flex items-center justify-center ${archiveInfoVisible ? "opacity-0 pointer-events-none" : "opacity-100"}`}
                                aria-label="Show info"
                              >
                                <span className="font-serif text-base italic text-white">i</span>
                              </button>
                              {/* Slide-in info panel - covers only this image, clickable anywhere to dismiss */}
                              <div
                                onClick={() => setArchiveInfoVisible(false)}
                                className={`absolute inset-0 bg-black/85 backdrop-blur-sm transform transition-transform duration-300 ease-out z-20 cursor-pointer flex flex-col justify-center p-3 sm:p-5 lg:p-8 overflow-y-auto ${
                                  archiveInfoVisible ? "translate-x-0" : "translate-x-full"
                                }`}
                              >
                                <h3 className="font-medium text-white text-base sm:text-lg lg:text-2xl m-2 text-justify">
                                  Exhibit PSD
                                </h3>
                                <p className="text-white/90 text-xs sm:text-sm lg:text-lg leading-relaxed text-justify m-2 lg:mb-6">
                                  Back when I attended the University of Florida, I gave out mixtape
                                  CDs and performed at various clubs and venues in downtown
                                  Gainesville. During my three-mixtape run from 2013 to when I
                                  graduated in 2015, I wrote raps to songs from The xx (Intro),
                                  Tinashe (2 On), and Carlos Santana (Maria Maria), recording them
                                  on Mixcraft in my apartment room closet. While making my third
                                  mixtape, I designed shirts with my initials-my original rap
                                  moniker-to share with the music. 100% cotton, still holding up.
                                  Can you spot the writing tool in my album artwork?
                                </p>
                                <div className="flex justify-center">
                                  <span className="text-white/60 text-[10px] sm:text-xs lg:text-sm bg-white/10 px-2 sm:px-3 py-1 lg:px-4 lg:py-1.5 rounded-full">
                                    Tap anywhere to see my vintage merch
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      ) : (
        /* Patron view - journey only, no sliding */
        <div className="h-full">
          <main className="w-full h-full flex flex-col relative">
            <div
              ref={journeyScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden overscroll-none scrollbar-hide"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
                <button
                  onClick={() => {
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
                  }}
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
                        <DiscIcon
                          className="w-7 h-7 lg:w-8 lg:h-8 text-blue-500"
                          weight="duotone"
                        />
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

                <div className="mb-8">
                  <h1 className="font-bebas text-[48px] sm:text-[64px] md:text-[80px] text-neutral-900 dark:text-white leading-none">
                    Stacking the Days
                  </h1>
                </div>

                {years.map((year) => {
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
                        className={`font-bebas text-[80px] md:text-[120px] leading-none pointer-events-none select-none mb-2 sticky top-0 backdrop-blur-md bg-neutral-50/80 dark:bg-neutral-950/80 z-10 py-2 transition-colors ${
                          isActiveYear
                            ? "text-neutral-400 dark:text-neutral-500"
                            : "text-neutral-200 dark:text-neutral-800"
                        }`}
                      >
                        {year}
                      </h2>

                      <div className="space-y-3 lg:space-y-4">
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
                                  className="w-full flex items-center gap-3 sm:gap-4 lg:gap-5 p-4 sm:p-5 lg:p-6 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors text-left group"
                                >
                                  <div className="w-14 sm:w-16 lg:w-20 shrink-0 flex flex-col items-center">
                                    <div className="text-sm lg:text-base uppercase tracking-wide leading-none text-neutral-500">
                                      {dateInfo.month}
                                    </div>
                                    <div className="font-bebas text-4xl sm:text-5xl lg:text-6xl leading-none text-neutral-400 dark:text-neutral-500">
                                      {dateInfo.day}
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-bebas text-xl sm:text-2xl lg:text-3xl leading-none text-neutral-700 dark:text-neutral-300">
                                      {event.title}
                                    </h3>
                                  </div>
                                  <div className="shrink-0 w-5 h-5 lg:w-6 lg:h-6 flex items-center justify-center font-serif text-sm lg:text-base italic text-neutral-400 group-hover:text-neutral-600 dark:group-hover:text-neutral-300 transition-colors">
                                    i
                                  </div>
                                </button>
                              </div>
                            );
                          }

                          const patienceTrack = TRACK_DATA.find((t) => t.id === "patience");
                          const isPatience =
                            isSingle && event.title === "Patience" && patienceTrack;
                          const isPatiencePlaying =
                            isPatience && isPlaying && currentTrack?.id === "patience";

                          return (
                            <div
                              key={event.id}
                              className={`flex items-center gap-3 sm:gap-4 lg:gap-5 p-3 sm:p-4 lg:p-5 border ${
                                isPatience ? "rounded-l-xl" : "rounded-xl"
                              } ${
                                isMusic
                                  ? "bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-700/50 shadow-sm shadow-amber-500/10"
                                  : "bg-white dark:bg-neutral-900/50 border-neutral-200 dark:border-neutral-800"
                              }`}
                            >
                              <div className="w-14 sm:w-16 lg:w-20 shrink-0 flex flex-col items-center">
                                <div
                                  className={`text-sm lg:text-base uppercase tracking-wide leading-none ${isMusic ? "text-amber-600 dark:text-amber-400" : "text-neutral-500"}`}
                                >
                                  {dateInfo.month}
                                </div>
                                <div
                                  className={`font-bebas text-4xl sm:text-5xl lg:text-6xl leading-none ${isMusic ? "text-amber-700 dark:text-amber-300" : "text-neutral-900 dark:text-white"}`}
                                >
                                  {dateInfo.day}
                                </div>
                              </div>

                              <div className="flex-1 min-w-0">
                                {style && (
                                  <div className="flex items-center gap-2 lg:gap-3">
                                    <span
                                      className={`px-2 lg:px-3 py-0.5 lg:py-1 rounded text-xs lg:text-sm font-medium ${style.bg} ${style.text}`}
                                    >
                                      {style.label}
                                    </span>
                                    {event.location && (
                                      <span className="text-neutral-500 text-sm lg:text-base truncate">
                                        {event.location}
                                      </span>
                                    )}
                                    {isContent && event.relatedSong && (
                                      <span className="text-neutral-500 text-sm lg:text-base truncate">
                                        {event.relatedSong}
                                      </span>
                                    )}
                                    {isFeature && event.artist && (
                                      <span className="text-neutral-500 text-sm lg:text-base truncate flex items-center gap-1">
                                        <UserIcon className="w-3 h-3 lg:w-4 lg:h-4" />
                                        {event.artist}
                                      </span>
                                    )}
                                  </div>
                                )}
                                <h3
                                  className={`font-bebas leading-none ${style ? "mt-2.5 lg:mt-3" : ""} mb-0.5 ${isMusic ? "text-2xl sm:text-3xl lg:text-4xl text-amber-800 dark:text-amber-200" : "text-xl sm:text-2xl lg:text-3xl text-neutral-900 dark:text-white"}`}
                                >
                                  {event.title}
                                </h3>
                                {event.description && (
                                  <p className="text-neutral-500 dark:text-neutral-400 text-sm lg:text-base">
                                    {event.description}
                                  </p>
                                )}
                                {event.url && event.urlLabel && (
                                  <Link
                                    href={event.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-block mt-2 text-sm lg:text-base text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 transition-colors"
                                  >
                                    {event.urlLabel}
                                  </Link>
                                )}
                              </div>

                              {isPatience &&
                                patienceTrack &&
                                (() => {
                                  const isPatienceLoading =
                                    isAudioLoading && currentTrack?.id === "patience";
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
                                      className="shrink-0 w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 -my-3 sm:-my-4 lg:-my-5 -mr-3 sm:-mr-4 lg:-mr-5 overflow-hidden relative group"
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
                                    </button>
                                  );
                                })()}
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}

                {/* From The Archives - expandable section */}
                <section ref={archiveSectionRef} className="mt-8 mb-16">
                  <button
                    onClick={() => {
                      const willExpand = !archiveExpanded;
                      setArchiveExpanded(willExpand);
                      if (willExpand && archiveSectionRef.current) {
                        setTimeout(() => {
                          archiveSectionRef.current?.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                          });
                        }, 50);
                      }
                    }}
                    className={`w-full flex items-center gap-3 sm:gap-4 lg:gap-5 p-4 sm:p-5 lg:p-6 bg-neutral-100/50 dark:bg-neutral-900/50 hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50 transition-colors text-left group ${archiveExpanded ? "rounded-t-xl" : "rounded-xl"}`}
                  >
                    <div className="w-14 sm:w-16 lg:w-20 shrink-0 flex items-center justify-center">
                      <ArchiveIcon className="w-8 h-8 lg:w-10 lg:h-10 text-neutral-400 dark:text-neutral-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bebas text-xl sm:text-2xl lg:text-3xl leading-none text-neutral-700 dark:text-neutral-300">
                        From The Archives: Exhibit PSD
                      </h3>
                    </div>
                    <CaretDownIcon
                      className={`w-5 h-5 lg:w-6 lg:h-6 text-neutral-400 transition-transform duration-200 ${
                        archiveExpanded ? "rotate-180" : ""
                      }`}
                      weight="bold"
                    />
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      archiveExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="relative rounded-b-xl overflow-hidden">
                        <div className="flex flex-col-reverse sm:flex-row">
                          <div className="aspect-[9/16] sm:w-1/2 relative bg-neutral-900 shrink-0">
                            <video
                              src="/videos/exhibit-psd-live.mp4"
                              className="w-full h-full object-cover"
                              controls
                              playsInline
                              poster="/images/covers/exhibit-psd-live-cover.jpg"
                            />
                            <div className="absolute top-0 left-0 p-3 pointer-events-none">
                              <div className="bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1">
                                <p className="text-white text-sm font-medium">
                                  Live with the band at High Dive
                                </p>
                                <p className="text-white/70 text-xs">Gainesville, FL · 2015</p>
                              </div>
                            </div>
                          </div>
                          <div className="sm:w-1/2 flex flex-col-reverse sm:flex-col">
                            <div className="aspect-[4/3] sm:aspect-auto sm:flex-[1] relative bg-neutral-900">
                              <img
                                src="/images/merch/lu-psd-merch.JPG"
                                alt="With the homie Ludger"
                                className="w-full h-full object-cover object-bottom"
                              />
                              <div className="absolute top-0 left-0 p-3">
                                <div className="bg-black/30 backdrop-blur-sm rounded-lg px-2 py-1">
                                  <p className="text-white text-sm font-medium">
                                    With the homie Ludger
                                  </p>
                                  <p className="text-white/70 text-xs">Los Angeles, CA · 2018</p>
                                </div>
                              </div>
                            </div>
                            <div className="aspect-square sm:aspect-auto sm:flex-[2] relative bg-neutral-900">
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
                                  <p className="text-white/90 text-xs">
                                    Shirts available at live shows
                                  </p>
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
                                className={`absolute inset-0 bg-black/85 backdrop-blur-sm transform transition-transform duration-300 ease-out z-20 cursor-pointer flex flex-col justify-center p-3 sm:p-5 lg:p-8 overflow-y-auto ${
                                  archiveInfoVisible ? "translate-x-0" : "translate-x-full"
                                }`}
                              >
                                <h3 className="font-medium text-white text-base sm:text-lg lg:text-2xl m-2 text-justify">
                                  Exhibit PSD
                                </h3>
                                <p className="text-white/90 text-xs sm:text-sm lg:text-lg leading-relaxed text-justify m-2 lg:mb-6">
                                  Back when I attended the University of Florida, I gave out mixtape
                                  CDs and performed at various clubs and venues in downtown
                                  Gainesville. During my three-mixtape run from 2013 to when I
                                  graduated in 2015, I wrote raps to songs from The xx (Intro),
                                  Tinashe (2 On), and Carlos Santana (Maria Maria), recording them
                                  on Mixcraft in my apartment room closet. While making my third
                                  mixtape, I designed shirts with my initials—my original rap
                                  moniker—to share with the music. 100% cotton, still holding up.
                                  Can you spot the writing tool in my album artwork?
                                </p>
                                <div className="flex justify-center">
                                  <span className="text-white/60 text-[10px] sm:text-xs lg:text-sm bg-white/10 px-2 sm:px-3 py-1 lg:px-4 lg:py-1.5 rounded-full">
                                    Tap anywhere to see my vintage merch
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* Bottom CTA - floating pill centered above audio player */}
      {viewMode === "journey" && !isPatron && showBottomCta && (
        <button
          onClick={() => handleViewModeChange("patron")}
          className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 md:px-8 md:py-4 cursor-pointer text-white font-medium text-sm md:text-base flex items-center gap-2 md:gap-3 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
          style={{ background: "linear-gradient(to right, #f97316, #ec4899)" }}
        >
          <MicrophoneStageIcon className="w-6 h-6 md:w-7 md:h-7" weight="regular" />
          Become my patron
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
                onClose={() => {
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
                      proceedToCheckout(amount, savedPeriod || billingPeriod);
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
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
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
