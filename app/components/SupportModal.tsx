"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import posthog from "posthog-js";
import {
  XIcon,
  CheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { useHydrated } from "../hooks/useHydrated";
import { useScrollLock } from "../hooks/useScrollLock";
import { PLAY_MASK_FLUSH, PAUSE_MASK_FLUSH } from "../lib/glyph-masks";
import { PATRON_TIERS } from "../data/patron-tiers";
import { PATRON_CONFIG } from "../data/patron-config";
import { TRACK_DATA } from "../data/tracks";
import { grossUpCents } from "../lib/fees";
import CheckoutEmbed from "./CheckoutEmbed";
import PatronSignInForm from "./PatronSignInForm";

const PICKER_TIERS = [...PATRON_TIERS].reverse();
const TIER_ICONS = PICKER_TIERS.map((tier) => tier.icon);
const TIER_COLORS = PICKER_TIERS.map((tier) => tier.color);

const MAX_CUSTOM_AMOUNT = 100000;
const MIN_CUSTOM_AMOUNT = PATRON_TIERS[PATRON_TIERS.length - 1].net;

const periodNetCents = (monthlyNetDollars: number, annual: boolean) =>
  Math.round(monthlyNetDollars * (annual ? 1000 : 100));
const SUPPORT_AMOUNTS = PICKER_TIERS.map((tier) => ({
  net: tier.net,
  name: tier.name,
  hint: tier.hint,
}));
const PREVIEW_TRACKS = PATRON_CONFIG.earlyAccess.trackIds
  .map((id) => TRACK_DATA.find((t) => t.id === id))
  .filter((t): t is NonNullable<typeof t> => !!t)
  .map((t) => ({ title: t.title, src: `/audio/${t.id}-preview.mp3` }));

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

type Preview = { title: string; src: string; autoplay?: boolean } | null;

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview?: Preview;
  source: string;
  absoluteOverlay?: boolean;
}

export default function SupportModal({
  open,
  onOpenChange,
  preview = null,
  source,
  absoluteOverlay = false,
}: SupportModalProps) {
  const tierModal = useModalStage(open);
  const backdropStage = useModalStage(open);
  const [signingIn, setSigningIn] = useState(false);
  useScrollLock(tierModal.mounted);
  const dismissTierModal = () => onOpenChange(false);

  useEffect(() => {
    if (!tierModal.mounted) setSigningIn(false);
  }, [tierModal.mounted]);

  return (
    <>
      {backdropStage.mounted && (
        <div
          ref={backdropStage.ref}
          className={`t-modal-backdrop ${backdropStage.stageClass} ${absoluteOverlay ? "absolute" : "fixed"} inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4`}
          onClick={() => open && dismissTierModal()}
        >
          {tierModal.mounted && (
            <div
              ref={tierModal.ref}
              className={`t-modal ${tierModal.stageClass} relative w-full max-w-md max-h-full overflow-y-auto rounded-2xl bg-neutral-50 dark:bg-neutral-950 ${signingIn ? "p-6" : "px-6 pt-6 pb-1"} shadow-xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={dismissTierModal}
                className="absolute z-20 right-4 top-4 w-11 h-11 rounded-full bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
              >
                <XIcon className="w-4 h-4 text-neutral-500" weight="bold" />
              </button>
              {signingIn ? (
                <>
                  <h2 className="pr-12 mb-4 font-bebas text-3xl text-neutral-900 dark:text-white">
                    Sign in with your supporter email
                  </h2>
                  <PatronSignInForm
                    onCancel={() => setSigningIn(false)}
                    onVerified={dismissTierModal}
                  />
                </>
              ) : (
                <MonthlySupporter
                  active={open}
                  preview={preview}
                  source={source}
                  panelBleed="-mx-6 [--tp-x:1.5rem]"
                  onSignIn={() => setSigningIn(true)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function MonthlySupporter({
  heading: Heading = "h2",
  panelBleed,
  onSignIn,
  og,
  ...picker
}: Omit<TierPickerProps, "panelClassName"> & {
  heading?: "h1" | "h2";
  panelBleed: string;
  onSignIn?: () => void;
  og?: boolean;
}) {
  return (
    <>
      <div className="mb-4 split:mb-[clamp(0.25rem,calc(-50px_+_6vh),1rem)]">
        <Heading className="font-bebas text-3xl text-neutral-900 dark:text-white">
          Be my monthly supporter
        </Heading>
        {!og && (
          <p className="text-base text-neutral-500 dark:text-neutral-400 mt-1">
            All supporters get every new song a month before anyone else and
            access to behind the scenes! Think Patreon, but the only cut is your
            card fee, added so I receive 100%. Cancel anytime.
          </p>
        )}
      </div>
      <TierPicker
        {...picker}
        panelClassName={`relative ${panelBleed} bg-neutral-100 dark:bg-neutral-900 overflow-hidden px-[var(--tp-x)] pb-6`}
      />
      {onSignIn && (
        <button
          onClick={onSignIn}
          className="block min-h-11 mt-1 py-3 split:py-[clamp(0.625rem,calc(-32px_+_4vh),0.75rem)] origin-left text-left text-base text-neutral-500 dark:text-neutral-400 transition-all duration-300 hover:scale-105 hover:text-neutral-900 hover:underline underline-offset-4 dark:hover:text-white active:opacity-60"
        >
          Already a supporter? Sign in
        </button>
      )}
    </>
  );
}

interface TierPickerProps {
  active?: boolean;
  preview?: Preview;
  source: string;
  panelClassName: string;
}

export function TierPicker({
  active = true,
  preview = null,
  source,
  panelClassName,
}: TierPickerProps) {
  const hydrated = useHydrated();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  useScrollLock(!!checkoutSecret);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">(
    "monthly",
  );
  const [customAmount, setCustomAmount] = useState(String(MIN_CUSTOM_AMOUNT));
  const soulInputRef = useRef<HTMLInputElement>(null);
  const soulPointerRef = useRef(false);
  const markSoulPointer = useRef((e: PointerEvent) => {
    if (e.target !== soulInputRef.current) soulPointerRef.current = true;
  }).current;

  const tierRowsRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
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

  const paintRow = (el: HTMLElement, index: number) => {
    el.style.backgroundColor = TIER_COLORS[index];
    el.querySelectorAll("*").forEach(
      (c) => ((c as HTMLElement).style.color = "white"),
    );
  };

  const clearRow = (el: HTMLElement, index: number) => {
    el.style.backgroundColor = "";
    el.querySelectorAll("*").forEach((c) => {
      if (!c.hasAttribute("data-icon")) (c as HTMLElement).style.color = "";
    });
    const icon = el.querySelector("[data-icon]") as HTMLElement | null;
    if (icon) icon.style.color = TIER_COLORS[index];
  };

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
    setSelectedTier(null);
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
      const rows = tierRowsRef.current?.querySelectorAll("button");
      rows?.forEach((row, i) => clearRow(row as HTMLElement, i));
      setIsLoading(false);
      setSelectedTier(null);
    }
  };

  const handleSubscribe = (
    netCents: number,
    period: "monthly" | "annually" = billingPeriod,
  ) => {
    const name = localStorage.getItem("liveCommenterName");

    posthog.capture("patron_tier_selected", {
      amount_cents: grossUpCents(netCents),
      billing_period: period,
      is_logged_in: !!name,
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

  const submitSoulTier = () => {
    if (isLoading || !hydrated || soulPointerRef.current) return;
    if (soulBelowMinimum) {
      snapSoulToMinimum();
      return;
    }
    const net = parseInt(customAmount, 10);
    soulPointerRef.current = true;
    const soulIndex = SUPPORT_AMOUNTS.findIndex((t) => t.name === "Soul");
    setSelectedTier("Soul");
    const row = tierRowsRef.current?.querySelectorAll("button")[soulIndex];
    if (row) paintRow(row, soulIndex);
    handleSubscribe(net * 100, billingPeriod);
  };

  return (
    <div className={panelClassName}>
      {checkoutSecret &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setCheckoutSecret(null)}
          >
            <div
              className="relative w-full max-w-[428px] max-h-full overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 py-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative z-10 flex items-center px-6">
                <button
                  type="button"
                  onClick={() => setCheckoutSecret(null)}
                  className="min-h-11 -mx-3 px-3 inline-flex items-center gap-2 text-left text-base font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" weight="bold" />
                  Back to tiers
                </button>
              </div>
              <div className="-mt-3 px-2">
                <CheckoutEmbed
                  fetchClientSecret={() => Promise.resolve(checkoutSecret)}
                  onComplete={() => {}}
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
      <>
        {currentPreview && (
          <div>
            <audio
              ref={audioRef}
              src={currentPreview.src}
              preload="auto"
              onPlaying={() => setPreviewStarted(true)}
              onPlay={() => setPreviewPlaying(true)}
              onPause={(e) => {
                if (!e.currentTarget.ended) setPreviewPlaying(false);
              }}
              onEnded={() => {
                if (previewIndex === previewList.length - 1)
                  setPreviewPlaying(false);
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
              className={`min-h-11 -mx-[var(--tp-x,1.5rem)] w-[calc(100%+2*var(--tp-x,1.5rem))] flex px-[var(--tp-x,1.5rem)] items-center gap-3 text-left py-5`}
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
        <div className="relative -mx-[var(--tp-x,1.5rem)] -mb-6">
          <form
            id="soul-price-form"
            className="hidden"
            onSubmit={(e) => {
              e.preventDefault();
              submitSoulTier();
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
            ref={tierRowsRef}
            className="border-t-2 border-neutral-200 dark:border-neutral-800"
          >
            {SUPPORT_AMOUNTS.map((tier, index) => {
              const TierIcon = TIER_ICONS[index];
              const isSoul = tier.name === "Soul";
              const isSelected = selectedTier === tier.name;
              const price =
                billingPeriod === "annually" ? tier.net * 10 : tier.net;
              const period = billingPeriod === "annually" ? "yr" : "mo";
              const annual = billingPeriod === "annually";
              return (
                <button
                  key={tier.name}
                  onClick={() => {
                    setSelectedTier(tier.name);
                    const row =
                      tierRowsRef.current?.querySelectorAll("button")[index];
                    if (row) paintRow(row, index);
                    if (isSoul) {
                      soulPointerRef.current = false;
                      submitSoulTier();
                      return;
                    }
                    handleSubscribe(periodNetCents(tier.net, annual));
                  }}
                  disabled={isLoading || !hydrated}
                  className={`min-h-11 w-full flex items-center gap-4 px-[var(--tp-x,1.5rem)] py-4 transition-colors group text-left ${
                    isLoading && !isSelected ? "opacity-40" : ""
                  }`}
                  onMouseEnter={(e) => {
                    if (isLoading) return;
                    paintRow(e.currentTarget, index);
                  }}
                  onMouseLeave={(e) => {
                    if (isLoading) return;
                    clearRow(e.currentTarget, index);
                  }}
                >
                  <p className="flex-1 min-w-0 flex flex-wrap items-center gap-x-1 text-base leading-snug text-neutral-600 dark:text-neutral-300">
                    <span
                      className={`inline-flex items-center gap-x-0.5 whitespace-nowrap ${isSoul ? "cursor-text" : ""}`}
                      onPointerDown={
                        isSoul ? (e) => e.stopPropagation() : undefined
                      }
                      onMouseDown={
                        isSoul
                          ? (e) => {
                              if (e.target !== soulInputRef.current)
                                e.preventDefault();
                            }
                          : undefined
                      }
                      onClick={
                        isSoul
                          ? (e) => {
                              e.stopPropagation();
                              soulInputRef.current?.focus();
                            }
                          : undefined
                      }
                    >
                      <span className="inline-flex items-center gap-x-0.5 whitespace-nowrap text-neutral-900 dark:text-white font-medium text-3xl leading-none tabular-nums">
                        {isSoul ? (
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
                                onFocus={(e) => {
                                  e.stopPropagation();
                                  soulPointerRef.current = false;
                                  document.addEventListener(
                                    "pointerdown",
                                    markSoulPointer,
                                    true,
                                  );
                                }}
                                onBlur={() => {
                                  document.removeEventListener(
                                    "pointerdown",
                                    markSoulPointer,
                                    true,
                                  );
                                  if (!document.hasFocus()) return;
                                  submitSoulTier();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key !== "Enter") return;
                                  e.preventDefault();
                                  if (soulBelowMinimum) {
                                    snapSoulToMinimum();
                                    return;
                                  }
                                  soulPointerRef.current = false;
                                  e.currentTarget.blur();
                                }}
                                className="col-start-1 row-start-1 w-full min-w-0 h-9 text-neutral-900 dark:text-white font-medium text-3xl tabular-nums p-0 bg-transparent outline-none border-b-2 border-neutral-300 dark:border-neutral-600 focus:border-neutral-900 dark:focus:border-white"
                              />
                            </span>
                          </>
                        ) : (
                          <>${price}</>
                        )}
                      </span>
                      <span>/{period}</span>
                    </span>
                    <span
                      className={
                        isSoul
                          ? "rounded-md bg-pink-500/15 px-2 py-0.5 text-pink-600 dark:text-pink-300"
                          : "text-balance"
                      }
                    >
                      {isSoul && soulBelowMinimum
                        ? `starts at $${soulMinimum.toLocaleString()}/${period}`
                        : tier.hint[billingPeriod]}
                    </span>
                  </p>
                  <span className="shrink-0 self-center">
                    <span className="h-9 flex flex-row-reverse items-center gap-2">
                      <ArrowRightIcon
                        aria-hidden
                        className="-ml-1 w-4 h-4 text-neutral-400 dark:text-neutral-500"
                        weight="bold"
                      />
                      <span className="w-[2.1em] text-neutral-900 dark:text-white font-medium text-xl leading-none">
                        {tier.name}
                      </span>
                      {isLoading && isSelected ? (
                        <span
                          aria-label="Opening checkout"
                          className="w-6 h-6 flex items-center justify-center"
                        >
                          <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </span>
                      ) : (
                        <TierIcon
                          data-icon
                          size={24}
                          weight="regular"
                          style={{ color: TIER_COLORS[index] }}
                        />
                      )}
                    </span>
                  </span>
                </button>
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
              className={`min-h-11 w-full px-[var(--tp-x,1.5rem)] py-4 font-medium text-neutral-900 dark:text-white flex items-center gap-2`}
            >
              <span
                className={`relative shrink-0 w-12 h-7 rounded-full transition-colors ${
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
                    <CheckIcon
                      size={16}
                      weight="bold"
                      className="text-orange-500"
                    />
                  )}
                </span>
              </span>
              <span className="leading-none whitespace-nowrap">
                Pay annually
              </span>
              <span className="rounded-md bg-green-500/15 px-2 py-0.5 font-normal whitespace-nowrap text-green-700 dark:text-green-400">
                2 months free
              </span>
            </button>
          </div>
        </div>
      </>
    </div>
  );
}
