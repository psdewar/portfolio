"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal, flushSync } from "react-dom";
import posthog from "posthog-js";
import { XIcon, CheckIcon, CaretDownIcon } from "@phosphor-icons/react";
import { useHydrated } from "../hooks/useHydrated";
import { useScrollLock } from "../hooks/useScrollLock";
import { useSession } from "../hooks/useSession";
import { useAudio } from "../contexts/AudioContext";
import { PLAY_MASK_FLUSH, PAUSE_MASK_FLUSH } from "../lib/glyph-masks";
import { PATRON_TIERS } from "../data/patron-tiers";
import { EARLY_ACCESS_TRACKS, toTrackPreview } from "../data/patron-config";
import { grossUpCents, formatCents, MAX_CARD_CENTS } from "../lib/fees";
import CheckoutPanel, { CHECKOUT_CARD } from "./CheckoutPanel";
import PatronSignInForm from "./PatronSignInForm";
import { PAYMENT_OPTIONS_STYLE } from "./PaymentOptions";
import { TipsSection } from "../support/TipsAndSocials";

const PICKER_TIERS = [...PATRON_TIERS].reverse();
const TIER_ICONS = PICKER_TIERS.map((tier) => tier.icon);
const TIER_COLORS = PICKER_TIERS.map((tier) => tier.color);

const MAX_CUSTOM_AMOUNT = MAX_CARD_CENTS / 100;
const MIN_CUSTOM_AMOUNT = PATRON_TIERS[PATRON_TIERS.length - 1].net;

const periodNetCents = (monthlyNetDollars: number, annual: boolean) =>
  Math.round(monthlyNetDollars * (annual ? 1000 : 100));
const SUPPORT_AMOUNTS = PICKER_TIERS.map((tier) => ({
  net: tier.net,
  name: tier.name,
  hint: tier.hint,
}));
const PREVIEW_TRACKS = EARLY_ACCESS_TRACKS.map(toTrackPreview);

function useModalStage(open: boolean) {
  const [mounted, setMounted] = useState(open);
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setIsClosing(false);
      setIsOpen(false);
      return;
    }
    setIsOpen(false);
    if (!mounted) return;
    setIsClosing(true);
    const closeMs =
      parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--modal-close-dur",
        ),
      ) || 150;
    const timeout = setTimeout(() => {
      setIsClosing(false);
      setMounted(false);
    }, closeMs);
    return () => clearTimeout(timeout);
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted || isOpen) return;
    const el = elRef.current;
    if (el) void el.offsetHeight;
    setIsOpen(true);
  }, [open, mounted, isOpen]);

  const stageClass = isOpen ? "is-open" : isClosing ? "is-closing" : "";
  return { mounted, stageClass, ref: elRef };
}

export function ModalShell({
  open,
  onClose,
  ariaLabel,
  panelClassName = "px-6 pt-6 pb-1",
  children,
}: {
  open: boolean;
  onClose: () => void;
  ariaLabel: string;
  panelClassName?: string;
  children: React.ReactNode;
}) {
  const tierModal = useModalStage(open);
  const backdropStage = useModalStage(open);
  useScrollLock(tierModal.mounted);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!backdropStage.mounted) return null;

  return createPortal(
    <div
      ref={backdropStage.ref}
      className={`t-modal-backdrop ${backdropStage.stageClass} fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4`}
      onClick={() => open && onClose()}
    >
      {tierModal.mounted && (
        <div
          ref={tierModal.ref}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel}
          className={`t-modal ${tierModal.stageClass} relative w-full max-w-md max-h-full overflow-y-auto rounded-2xl bg-neutral-50 dark:bg-neutral-950 ${panelClassName} shadow-xl`}
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`body:has([role="dialog"][aria-modal="true"]) button[title="Dev Tools"] { display: none; }`}</style>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute z-20 right-4 top-4 w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
          >
            <XIcon className="w-4 h-4 text-neutral-500" weight="bold" />
          </button>
          {children}
        </div>
      )}
    </div>,
    document.body,
  );
}

type Preview = { title: string; src: string; autoplay?: boolean } | null;

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview?: Preview;
  source: string;
  showFundSection?: boolean;
  concertCount?: number;
  onLoudPlay?: () => void;
  onLoudEnd?: () => void;
  onRegisterSilence?: (silence: () => void) => void;
}

export default function SupportModal({
  open,
  onOpenChange,
  preview = null,
  source,
  showFundSection = false,
  concertCount = 0,
  onLoudPlay,
  onLoudEnd,
  onRegisterSilence,
}: SupportModalProps) {
  const [signingIn, setSigningIn] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const dismiss = () => onOpenChange(false);

  useEffect(() => {
    if (!open) {
      setSigningIn(false);
      setDetailsOpen(false);
    }
  }, [open]);

  return (
    <ModalShell
      open={open}
      onClose={dismiss}
      ariaLabel={signingIn ? "Sign in" : "Support"}
      panelClassName={signingIn ? "p-6" : "px-6 pt-6 pb-1"}
    >
      {signingIn ? (
        <>
          <h2 className="pr-12 mb-4 text-xl font-semibold text-neutral-900 dark:text-white">
            Sign in with your supporter email
          </h2>
          <PatronSignInForm
            onCancel={() => setSigningIn(false)}
            onVerified={dismiss}
          />
        </>
      ) : (
        <>
          {showFundSection && (
            <div className="mb-8">
              <TipsSection concertCount={concertCount} />
            </div>
          )}
          <MonthlySupporter
            active={open}
            preview={preview}
            source={source}
            panelBleed="-mx-6 [--tp-x:1.5rem]"
            onSignIn={() => setSigningIn(true)}
            collapsibleSubtitle={showFundSection}
            collapseTiers={showFundSection}
            detailsOpen={detailsOpen}
            onToggleDetails={() => setDetailsOpen(true)}
            onLoudPlay={onLoudPlay}
            onLoudEnd={onLoudEnd}
            onRegisterSilence={onRegisterSilence}
          />
        </>
      )}
    </ModalShell>
  );
}

export function MonthlySupporter({
  heading: Heading = "h2",
  panelBleed,
  onSignIn,
  og,
  collapsibleSubtitle = false,
  collapseTiers = false,
  detailsOpen = false,
  onToggleDetails,
  ...picker
}: Omit<TierPickerProps, "panelClassName"> & {
  heading?: "h1" | "h2";
  panelBleed: string;
  onSignIn?: () => void;
  og?: boolean;
  collapsibleSubtitle?: boolean;
  collapseTiers?: boolean;
  detailsOpen?: boolean;
  onToggleDetails?: () => void;
}) {
  const isExpanded = !collapsibleSubtitle || detailsOpen;
  const showTiers = !collapsibleSubtitle || !collapseTiers || detailsOpen;

  return (
    <div>
      <div className={isExpanded ? "mb-4 split:mb-[clamp(0.25rem,calc(-50px_+_6vh),1rem)]" : "mb-2"}>
        {isExpanded ? (
          <Heading className="font-bebas text-neutral-900 dark:text-white text-3xl">
            Be my monthly supporter
          </Heading>
        ) : (
          <Heading className="m-0 leading-none">
            <button
              type="button"
              onClick={onToggleDetails}
              className="-mx-[var(--tp-x,1.5rem)] w-[calc(100%+2*var(--tp-x,1.5rem))] px-[var(--tp-x,1.5rem)] py-2 -my-2 flex items-center justify-between gap-3 text-left transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40 active:bg-neutral-200/50 dark:active:bg-neutral-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-white"
            >
              <span className="flex flex-col">
                <span className="font-bebas text-neutral-900 dark:text-white text-3xl">
                  Be my monthly supporter
                </span>
                {!og && (
                  <span className="mt-0.5 text-base font-normal text-neutral-500 dark:text-neutral-400">
                    Find out more
                  </span>
                )}
              </span>
              <CaretDownIcon
                weight="bold"
                aria-hidden
                className="shrink-0 w-4 h-4 text-neutral-400"
              />
            </button>
          </Heading>
        )}
        {!og && isExpanded && (
          <p className="text-neutral-500 dark:text-neutral-400 text-base mt-1">
            All supporters get every new song a month before anyone else and
            access to behind the scenes! Think Patreon, but the only cut is
            your card fee, added so I receive 100%. Cancel anytime.
          </p>
        )}
      </div>
      {showTiers && (
        <TierPicker
          {...picker}
          panelClassName={`relative ${panelBleed} bg-neutral-100 dark:bg-neutral-900 overflow-hidden px-[var(--tp-x)] pb-6`}
        />
      )}
      {onSignIn && isExpanded && (
        <button
          type="button"
          onClick={onSignIn}
          className="min-h-11 -mx-[var(--tp-x,1.5rem)] w-[calc(100%+2*var(--tp-x,1.5rem))] flex items-center px-[var(--tp-x,1.5rem)] py-3 split:py-[clamp(0.625rem,calc(-32px_+_4vh),0.75rem)] mt-1 text-left text-base text-neutral-500 dark:text-neutral-400 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-white"
        >
          Already a supporter?&nbsp;
          <span className="underline underline-offset-4 text-neutral-900 dark:text-white">Sign in</span>
        </button>
      )}
    </div>
  );
}

interface TierPickerProps {
  active?: boolean;
  preview?: Preview;
  source: string;
  panelClassName: string;
  onLoudPlay?: () => void;
  onLoudEnd?: () => void;
  onRegisterSilence?: (silence: () => void) => void;
}

export function TierPicker({
  active = true,
  preview = null,
  source,
  panelClassName,
  onLoudPlay,
  onLoudEnd,
  onRegisterSilence,
}: TierPickerProps) {
  const hydrated = useHydrated();
  const { session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(() =>
    Math.max(0, SUPPORT_AMOUNTS.findIndex((t) => t.name === "Flow")),
  );
  const [selectionTick, setSelectionTick] = useState(0);
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  useScrollLock(!!checkoutSecret);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">(
    "monthly",
  );
  const [customAmount, setCustomAmount] = useState(String(MIN_CUSTOM_AMOUNT));
  const soulInputRef = useRef<HTMLInputElement>(null);
  const rowRefs = useRef<(HTMLDivElement | null)[]>([]);

  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    onRegisterSilence?.(() => audioRef.current?.pause());
  }, [onRegisterSilence]);
  const { pause: pauseTrack } = useAudio();
  const previewPlayedRef = useRef<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [previewStarted, setPreviewStarted] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [pickedSrc, setPickedSrc] = useState<string | null>(null);
  const previewList = PREVIEW_TRACKS.some((t) => t.src === preview?.src)
    ? PREVIEW_TRACKS
    : preview
      ? [preview]
      : [];
  const previewIndex = Math.max(
    0,
    previewList.findIndex((t) => t.src === (pickedSrc ?? preview?.src)),
  );
  const currentPreview = previewList[previewIndex] ?? null;

  useEffect(() => {
    if (!active || !currentPreview) return;
    const el = audioRef.current;
    if (!el) return;
    if (previewPlayedRef.current === currentPreview.src) return;
    if (previewPlayedRef.current === null) setPreviewStarted(false);
    previewPlayedRef.current = currentPreview.src;
    setProgress(0);
    el.currentTime = 0;
    if (pickedSrc === null && preview?.autoplay === false) return;
    el.play().catch(() => {});
  }, [active, preview, currentPreview, pickedSrc]);

  useEffect(() => {
    if (active) return;
    audioRef.current?.pause();
    setPreviewPlaying(false);
    setSelectedIndex(Math.max(0, SUPPORT_AMOUNTS.findIndex((t) => t.name === "Flow")));
    setCheckoutSecret(null);
  }, [active]);

  const proceedToCheckout = async (
    netAmount: number,
    period: "monthly" | "annually",
  ) => {
    setIsLoading(true);

    const isAnnual = period === "annually";
    const finalAmount = grossUpCents(netAmount);
    const interval = isAnnual ? "year" : "month";
    const displayAmount = Math.round(netAmount / 100);

    posthog.capture("patron_checkout_initiated", {
      amount_cents: finalAmount,
      net_amount: netAmount,
      billing_period: period,
      display_amount: displayAmount,
      source,
    });

    try {
      const response = await fetch("/api/fund-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectTitle: `$${displayAmount}/${interval} - ${period === "annually" ? "Annual" : "Monthly"} Support`,
          projectId:
            period === "annually" ? "annual-support" : "monthly-support",
          amount: finalAmount,
          interval,
          embedded: true,
        }),
      });

      const { clientSecret, error: serverError } = await response.json();

      if (serverError || !clientSecret) {
        throw new Error(serverError || "Failed to create checkout");
      }

      setCheckoutSecret(clientSecret);
    } catch (error) {
      console.error("Error creating checkout:", error);
      alert("There was an error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubscribe = (
    netCents: number,
    period: "monthly" | "annually" = billingPeriod,
  ) => {
    posthog.capture("patron_tier_selected", {
      amount_cents: grossUpCents(netCents),
      billing_period: period,
      is_logged_in: !!session,
      source,
    });

    proceedToCheckout(netCents, period);
  };

  const nextPreview = () => {
    if (previewIndex < previewList.length - 1)
      setPickedSrc(previewList[previewIndex + 1].src);
  };

  const togglePreview = () => {
    const el = audioRef.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    if (el.ended && previewIndex > 0) {
      setPickedSrc(previewList[0].src);
      return;
    }
    if (el.ended) el.currentTime = 0;
    el.play().catch(() => {});
  };

  const soulMinimum =
    billingPeriod === "annually" ? MIN_CUSTOM_AMOUNT * 10 : MIN_CUSTOM_AMOUNT;
  const soulBelowMinimum = !(parseInt(customAmount, 10) >= soulMinimum);

  const snapSoulToMinimum = () => {
    setCustomAmount(String(soulMinimum));
    const input = soulInputRef.current;
    input?.focus();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    input?.parentElement?.animate(
      [0, -6, 6, -4, 4, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 320, easing: "ease-out" },
    );
  };

  const selectedTierData = SUPPORT_AMOUNTS[selectedIndex];
  const selectedIsSoul = selectedTierData.name === "Soul";
  const annual = billingPeriod === "annually";
  const soulAmountNum = parseInt(customAmount, 10) || 0;
  const selectedNetCents = selectedIsSoul
    ? soulAmountNum * 100
    : periodNetCents(selectedTierData.net, annual);
  const payWithCardLabel = `Pay ${formatCents(grossUpCents(selectedNetCents))} with your card`;

  const handleSupportClick = () => {
    if (isLoading || !hydrated) return;
    if (selectedIsSoul) {
      if (soulBelowMinimum) {
        snapSoulToMinimum();
        return;
      }
      handleSubscribe(soulAmountNum * 100, billingPeriod);
      return;
    }
    handleSubscribe(periodNetCents(selectedTierData.net, annual));
  };

  const selectTier = (index: number, focusRow = false) => {
    setSelectionTick((t) => t + 1);
    if (SUPPORT_AMOUNTS[index].name === "Soul") {
      flushSync(() => setSelectedIndex(index));
      soulInputRef.current?.focus();
      return;
    }
    setSelectedIndex(index);
    if (focusRow) rowRefs.current[index]?.focus();
  };

  const handleRowKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    index: number,
  ) => {
    const dir =
      e.key === "ArrowDown" || e.key === "ArrowRight"
        ? 1
        : e.key === "ArrowUp" || e.key === "ArrowLeft"
          ? -1
          : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (index + dir + SUPPORT_AMOUNTS.length) % SUPPORT_AMOUNTS.length;
    selectTier(next, true);
  };

  return (
    <>
      {checkoutSecret &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setCheckoutSecret(null)}
          >
            <div
              className={`${CHECKOUT_CARD} max-h-full overflow-y-auto`}
              onClick={(e) => e.stopPropagation()}
            >
              <CheckoutPanel
                backLabel="Back to tiers"
                onBack={() => setCheckoutSecret(null)}
                fetchClientSecret={() => Promise.resolve(checkoutSecret)}
                onComplete={() => {}}
              />
            </div>
          </div>,
          document.body,
        )}
      <div className={panelClassName}>
        {currentPreview && (
          <div>
            <audio
              ref={audioRef}
              src={currentPreview.src}
              preload="auto"
              onPlaying={() => setPreviewStarted(true)}
              onPlay={() => {
                pauseTrack();
                setPreviewPlaying(true);
                onLoudPlay?.();
              }}
              onPause={(e) => {
                if (!e.currentTarget.ended) setPreviewPlaying(false);
                onLoudEnd?.();
              }}
              onEnded={() => {
                if (previewIndex === previewList.length - 1) setPreviewPlaying(false);
                onLoudEnd?.();
                nextPreview();
              }}
              onTimeUpdate={(e) => {
                const el = e.currentTarget;
                if (el.duration) setProgress(el.currentTime / el.duration);
              }}
            />
            <button
              type="button"
              onClick={togglePreview}
              aria-label={previewPlaying ? "Pause preview" : "Play preview"}
              className={`min-h-11 -mx-[var(--tp-x,1.5rem)] w-[calc(100%+2*var(--tp-x,1.5rem))] flex px-[var(--tp-x,1.5rem)] items-center gap-3 text-left py-3 transition-colors hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40 active:bg-neutral-200/50 dark:active:bg-neutral-800/40 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-900 dark:focus-visible:outline-white`}
            >
              <span aria-hidden className="w-6 shrink-0 flex justify-center">
                <span
                  className="w-4 h-4 bg-gradient-to-br from-orange-400 to-pink-500"
                  style={previewPlaying ? PAUSE_MASK_FLUSH : PLAY_MASK_FLUSH}
                />
              </span>
              <span className="truncate text-base font-medium text-neutral-900 dark:text-white">
                {previewStarted ? "Previewing" : "Preview"} &quot;
                {currentPreview.title}&quot;
              </span>
            </button>
          </div>
        )}
        <div className="relative overflow-hidden -mx-[var(--tp-x,1.5rem)] -mb-6">
          <img
            src="/images/support/tiers-bg.webp"
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className={`pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-[48%_40%] transition-opacity duration-300 motion-reduce:transition-none ${previewPlaying ? "opacity-[0.3] dark:opacity-[0.4]" : "opacity-[0.12] dark:opacity-[0.18]"}`}
          />
          <form
            id="soul-price-form"
            className="hidden"
            onSubmit={(e) => {
              e.preventDefault();
              handleSupportClick();
            }}
          />
          {currentPreview && (
            <div
              aria-hidden
              className="absolute top-0 left-0 z-10 h-0.5 bg-gradient-to-r from-orange-400 to-pink-500"
              style={{ width: `${Math.min(100, progress * 100)}%` }}
            />
          )}
          <div
            role="radiogroup"
            aria-label="Monthly support amount"
            className={`border-t-2 border-neutral-200 dark:border-neutral-800 ${isLoading ? "opacity-60 pointer-events-none" : ""}`}
          >
            <style>{`
              @keyframes tierCheckDraw {
                from { stroke-dashoffset: 15.26; }
                to { stroke-dashoffset: 0; }
              }
              .tier-check-path {
                stroke-dasharray: 15.26;
                stroke-dashoffset: 15.26;
                animation-name: tierCheckDraw;
                animation-duration: 320ms;
                animation-delay: 80ms;
                animation-timing-function: ease-out;
                animation-fill-mode: both;
              }
              @media (prefers-reduced-motion: reduce) {
                .tier-check-path {
                  animation: none;
                  stroke-dashoffset: 0;
                }
              }
            `}</style>
            {SUPPORT_AMOUNTS.map((tier, index) => {
              const TierIcon = TIER_ICONS[index];
              const isSoul = tier.name === "Soul";
              const isSelected = index === selectedIndex;
              const price =
                billingPeriod === "annually" ? tier.net * 10 : tier.net;
              const period = billingPeriod === "annually" ? "yr" : "mo";
              const tierColor = TIER_COLORS[index];
              return (
                <div
                  key={tier.name}
                  ref={(el) => {
                    rowRefs.current[index] = el;
                  }}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => selectTier(index)}
                  onKeyDown={(e) => handleRowKeyDown(e, index)}
                  className={`relative z-10 w-full flex px-[var(--tp-x,1.5rem)] items-center min-h-11 gap-4 py-4 cursor-pointer transition-colors duration-300 motion-reduce:transition-none ${
                    isSelected
                      ? previewPlaying
                        ? "bg-neutral-100/45 dark:bg-neutral-900/45"
                        : "bg-neutral-200/50 dark:bg-neutral-800/40"
                      : `hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40 ${previewPlaying ? "bg-neutral-100/45 dark:bg-neutral-900/45" : "bg-neutral-100/80 dark:bg-neutral-900/80"}`
                  }`}
                >
                  <p className="flex-1 min-w-0 flex items-center gap-x-1 leading-snug text-neutral-600 dark:text-neutral-300 flex-wrap text-base">
                    <span
                      className={`inline-flex items-center gap-x-0.5 whitespace-nowrap ${isSoul && isSelected ? "cursor-text" : ""}`}
                      onClick={
                        isSoul && isSelected
                          ? (e) => {
                              e.stopPropagation();
                              soulInputRef.current?.focus();
                            }
                          : undefined
                      }
                    >
                      <span
                        className="inline-flex items-center gap-x-0.5 whitespace-nowrap font-medium leading-none tabular-nums text-3xl text-neutral-900 dark:text-white"
                        style={isSelected ? { color: tierColor } : undefined}
                      >
                        {isSoul ? (
                          isSelected ? (
                            <>
                              $
                              <span className="inline-grid">
                                <span
                                  aria-hidden
                                  className="invisible col-start-1 row-start-1 whitespace-pre pr-0.5"
                                >
                                  {customAmount || "0"}
                                </span>
                                <input
                                  ref={soulInputRef}
                                  type="text"
                                  inputMode="numeric"
                                  size={1}
                                  enterKeyHint="go"
                                  form="soul-price-form"
                                  value={customAmount}
                                  onChange={(e) => {
                                    const digitsOnly = e.target.value
                                      .replace(/\D/g, "")
                                      .slice(0, 6);
                                    const clamped =
                                      digitsOnly &&
                                      parseInt(digitsOnly, 10) > MAX_CUSTOM_AMOUNT
                                        ? String(MAX_CUSTOM_AMOUNT)
                                        : digitsOnly;
                                    setCustomAmount(clamped);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={() => {
                                    if (soulBelowMinimum) snapSoulToMinimum();
                                  }}
                                  onKeyDown={(e) => {
                                    if (
                                      e.key === "ArrowUp" ||
                                      e.key === "ArrowDown" ||
                                      e.key === "ArrowLeft" ||
                                      e.key === "ArrowRight"
                                    ) {
                                      e.stopPropagation();
                                      return;
                                    }
                                    if (e.key !== "Enter") return;
                                    e.preventDefault();
                                    if (soulBelowMinimum) {
                                      snapSoulToMinimum();
                                      return;
                                    }
                                    e.currentTarget.blur();
                                    handleSupportClick();
                                  }}
                                  className="col-start-1 row-start-1 w-full min-w-0 font-medium tabular-nums p-0 bg-transparent outline-none border-b-2 border-neutral-300 dark:border-neutral-600 focus:border-neutral-900 dark:focus:border-white h-9 text-3xl"
                                />
                              </span>
                            </>
                          ) : (
                            <>${soulAmountNum.toLocaleString()}</>
                          )
                        ) : (
                          <>${price}</>
                        )}
                      </span>
                      <span>/{period}</span>
                    </span>
                    <span
                      className={
                        isSoul
                          ? "rounded-md bg-pink-500/15 py-0.5 text-pink-600 dark:text-pink-300 min-w-0 px-2"
                          : "text-balance"
                      }
                    >
                      {isSoul && soulBelowMinimum
                        ? `starts at $${soulMinimum.toLocaleString()}/${period}`
                        : tier.hint[billingPeriod]}
                    </span>
                  </p>
                  <span className="shrink-0 self-center">
                    <span className="flex items-center gap-2 h-9">
                      <TierIcon
                        data-icon
                        size={24}
                        weight="regular"
                        style={{ color: tierColor }}
                      />
                      <span className="w-[2.1em] text-neutral-900 dark:text-white font-medium leading-none text-xl">
                        {tier.name}
                      </span>
                      <span
                        className={`w-4 h-4 shrink-0 rounded-full flex items-center justify-center ${isSelected ? "" : "border border-current text-neutral-900 dark:text-white opacity-40"}`}
                        style={isSelected ? { backgroundColor: tierColor } : undefined}
                        aria-hidden
                      >
                        {isSelected && (
                          <svg
                            key={`${selectedIndex}-${selectionTick}`}
                            width="10"
                            height="10"
                            viewBox="0 0 16 16"
                            fill="none"
                          >
                            <polyline
                              className="tier-check-path"
                              points="3,9 6.5,12.5 13,4.5"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        )}
                      </span>
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-start text-base">
            <button
              onClick={() => {
                const nextPeriod =
                  billingPeriod === "monthly" ? "annually" : "monthly";
                setBillingPeriod(nextPeriod);
                setCustomAmount((prev) => {
                  const net = parseInt(prev, 10);
                  if (!net) return prev;
                  const scaled =
                    nextPeriod === "annually" ? net * 10 : Math.round(net / 10);
                  return scaled.toString();
                });
              }}
              className={`relative z-10 w-full px-[var(--tp-x,1.5rem)] font-medium text-neutral-900 dark:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800/40 flex items-center gap-2 min-h-11 py-4 transition-colors duration-300 motion-reduce:transition-none ${previewPlaying ? "bg-neutral-100/45 dark:bg-neutral-900/45" : "bg-neutral-100/80 dark:bg-neutral-900/80"}`}
            >
              <span
                className={`relative shrink-0 rounded-full transition-colors w-12 h-7 ${
                  billingPeriod === "annually"
                    ? "bg-orange-500"
                    : "bg-neutral-300 dark:bg-neutral-700"
                }`}
              >
                <span
                  className={`absolute top-0.5 rounded-full bg-white shadow-sm flex items-center justify-center transition-all w-6 h-6 ${
                    billingPeriod === "annually" ? "left-[22px]" : "left-0.5"
                  }`}
                >
                  {billingPeriod === "annually" && (
                    <CheckIcon size={16} weight="bold" className="text-orange-500" />
                  )}
                </span>
              </span>
              <span className="leading-none whitespace-nowrap">
                Pay annually
              </span>
              <span className="rounded-md bg-green-500/15 font-normal whitespace-nowrap text-green-700 dark:text-green-400 px-2 py-0.5">
                2 months free
              </span>
            </button>
          </div>
        </div>
      </div>
      <style>{PAYMENT_OPTIONS_STYLE}</style>
      <button
        type="button"
        onClick={handleSupportClick}
        disabled={isLoading || !hydrated}
        className="cc-btn cc-card mt-4"
      >
        {isLoading ? (
          <>
            <span className="cc-spinner" />
            Opening checkout
          </>
        ) : (
          payWithCardLabel
        )}
      </button>
    </>
  );
}
