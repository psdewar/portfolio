"use client";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import { XIcon, CheckIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import { useHydrated } from "../hooks/useHydrated";
import { PLAY_MASK_FLUSH, PAUSE_MASK_FLUSH } from "../lib/glyph-masks";
import { PATRON_TIERS } from "../data/patron-tiers";
import { grossUpCents, feeCents as netFeeCents, formatFee } from "../lib/fees";
import CheckoutEmbed from "./CheckoutEmbed";

const TIER_ICONS = PATRON_TIERS.map((tier) => tier.icon);
const TIER_COLORS = PATRON_TIERS.map((tier) => tier.color);

const MAX_CUSTOM_AMOUNT = 100000;
const MIN_CUSTOM_AMOUNT = PATRON_TIERS[PATRON_TIERS.length - 1].net;

const periodNetCents = (monthlyNetDollars: number, annual: boolean) =>
  Math.round(monthlyNetDollars * (annual ? 1000 : 100));
const feeCents = (monthlyNetDollars: number, annual: boolean) =>
  netFeeCents(periodNetCents(monthlyNetDollars, annual));
const SUPPORT_AMOUNTS = PATRON_TIERS.map((tier) => ({ net: tier.net, name: tier.name }));

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
        getComputedStyle(document.documentElement).getPropertyValue("--modal-close-dur"),
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

interface SupportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview?: { title: string; src: string } | null;
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
  const hydrated = useHydrated();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">("monthly");
  const [customAmount, setCustomAmount] = useState(
    String(SUPPORT_AMOUNTS[SUPPORT_AMOUNTS.length - 1].net),
  );
  const amountSizerRef = useRef<HTMLSpanElement>(null);
  const [amountWidth, setAmountWidth] = useState(0);
  const soulPointerRef = useRef(false);
  const markSoulPointer = useRef(() => {
    soulPointerRef.current = true;
  }).current;

  const tierFlashedRef = useRef(false);
  const tierFlashingRef = useRef(false);
  const flashTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const tierRowsRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewPlayedRef = useRef<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [previewStarted, setPreviewStarted] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const tierModal = useModalStage(open);
  const backdropStage = useModalStage(open);

  useEffect(() => {
    const el = amountSizerRef.current;
    if (!el) return;
    setAmountWidth(el.getBoundingClientRect().width);
  }, [customAmount, open, tierModal.mounted, billingPeriod]);

  useEffect(() => {
    loadingRef.current = isLoading;
  }, [isLoading]);

  const paintRow = (el: HTMLElement, index: number) => {
    el.style.backgroundColor = TIER_COLORS[index];
    el.querySelectorAll("*").forEach((c) => ((c as HTMLElement).style.color = "white"));
  };

  const clearRow = (el: HTMLElement, index: number) => {
    el.style.backgroundColor = "";
    el.querySelectorAll("*").forEach((c) => {
      if (!c.hasAttribute("data-icon")) (c as HTMLElement).style.color = "";
    });
    const icon = el.querySelector("[data-icon]") as HTMLElement | null;
    if (icon) icon.style.color = TIER_COLORS[index];
  };

  const stopFlash = () => {
    flashTimeoutsRef.current.forEach(clearTimeout);
    flashTimeoutsRef.current = [];
    tierFlashingRef.current = false;
    const rows = tierRowsRef.current?.querySelectorAll("button");
    rows?.forEach((row, i) => clearRow(row as HTMLElement, i));
  };

  useEffect(() => {
    if (!open || !tierModal.mounted || (preview && !previewStarted) || tierFlashedRef.current) return;
    const rows = tierRowsRef.current?.querySelectorAll("button");
    if (!rows || rows.length === 0) return;
    tierFlashedRef.current = true;
    tierFlashingRef.current = true;
    const els = Array.from(rows) as HTMLElement[];
    els.forEach((el) => {
      el.style.transition = "background-color 0.3s ease";
      el.querySelectorAll("*").forEach((c) => ((c as HTMLElement).style.transition = "color 0.3s ease"));
    });
    const push = (fn: () => void, delay: number) => {
      flashTimeoutsRef.current.push(setTimeout(fn, delay));
    };
    push(() => {
      els.forEach((el, i) => {
        push(() => paintRow(el, i), i * 400);
      });
      const fadeStart = els.length * 400 + 600;
      els.forEach((el, i) => {
        push(() => clearRow(el, i), fadeStart + i * 400);
      });
      push(() => {
        tierFlashingRef.current = false;
        if (loadingRef.current) return;
        const i = els.findIndex((el) => el.matches(":hover"));
        if (i >= 0) paintRow(els[i], i);
      }, fadeStart + els.length * 400 + 300);
    }, 500);
    return () => {
      tierFlashingRef.current = false;
      flashTimeoutsRef.current.forEach(clearTimeout);
      flashTimeoutsRef.current = [];
    };
  }, [open, tierModal.mounted, preview, previewStarted]);

  useEffect(() => {
    if (!open || !tierModal.mounted || !preview) return;
    const el = audioRef.current;
    if (!el) return;
    if (previewPlayedRef.current === preview.src) return;
    previewPlayedRef.current = preview.src;
    setProgress(0);
    setPreviewStarted(false);
    el.currentTime = 0;
    el.play().catch(() => {});
  }, [open, tierModal.mounted, preview]);

  useEffect(() => {
    if (open) return;
    audioRef.current?.pause();
    setPreviewPlaying(false);
    setSelectedTier(null);
    setCheckoutSecret(null);
  }, [open]);

  const proceedToCheckout = async (netAmount: number, period: "monthly" | "annually") => {
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
          projectId: period === "annually" ? "annual-support" : "monthly-support",
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

  const handleSubscribe = (netCents: number, period: "monthly" | "annually" = billingPeriod) => {
    const name = localStorage.getItem("liveCommenterName");

    posthog.capture("patron_tier_selected", {
      amount_cents: grossUpCents(netCents),
      billing_period: period,
      is_logged_in: !!name,
      source,
    });

    proceedToCheckout(netCents, period);
  };

  const dismissTierModal = () => {
    previewPlayedRef.current = null;
    setProgress(0);
    onOpenChange(false);
  };

  const togglePreview = () => {
    const el = audioRef.current;
    if (!el) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    if (el.ended) el.currentTime = 0;
    el.play().catch(() => {});
  };

  const submitSoulTier = () => {
    if (isLoading || !hydrated || soulPointerRef.current) return;
    const net = parseInt(customAmount, 10);
    const minimum = billingPeriod === "annually" ? MIN_CUSTOM_AMOUNT * 10 : MIN_CUSTOM_AMOUNT;
    if (!net || net < minimum) {
      setCustomAmount(String(minimum));
      return;
    }
    soulPointerRef.current = true;
    handleSubscribe(net * 100, billingPeriod);
  };

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
            className={`t-modal ${tierModal.stageClass} bg-white dark:bg-neutral-900 rounded-2xl p-6 w-full shadow-xl max-h-full overflow-y-auto ${checkoutSecret ? "max-w-lg" : "max-w-md"}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex justify-between mb-1 ${checkoutSecret ? "items-center" : "items-start"}`}>
              {checkoutSecret ? (
                <button
                  type="button"
                  onClick={() => setCheckoutSecret(null)}
                  className="min-h-11 inline-flex items-center gap-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4" weight="bold" />
                  Back to tiers
                </button>
              ) : (
                <div>
                  <h3 className="font-bebas text-2xl text-neutral-900 dark:text-white">
                    Choose a Tier
                  </h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                    Every tier unlocks the same unreleased music and behind-the-scenes content. Give what you can.
                  </p>
                </div>
              )}
              <button
                onClick={dismissTierModal}
                className={`w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors shrink-0 ${checkoutSecret ? "" : "-mt-1.5"}`}
              >
                <XIcon className="w-4 h-4 text-neutral-500" weight="bold" />
              </button>
            </div>
            {checkoutSecret ? (
              <div className="pt-3">
                <CheckoutEmbed
                  fetchClientSecret={() => Promise.resolve(checkoutSecret)}
                  onComplete={() => {}}
                />
              </div>
            ) : (
              <>
            <div className={`flex items-center justify-start text-sm ${preview ? "" : "mb-4"}`}>
              <button
                onClick={() => {
                  const nextPeriod = billingPeriod === "monthly" ? "annually" : "monthly";
                  setBillingPeriod(nextPeriod);
                  setCustomAmount((prev) => {
                    const net = parseInt(prev, 10);
                    if (!net) return prev;
                    const scaled = nextPeriod === "annually" ? net * 10 : Math.round(net / 10);
                    return scaled.toString();
                  });
                }}
                className="min-h-11 w-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors py-2 flex items-center gap-2"
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
            {preview && (
              <div className="mb-2">
                <audio
                  ref={audioRef}
                  src={preview.src}
                  preload="auto"
                  onPlaying={() => setPreviewStarted(true)}
                  onPlay={() => setPreviewPlaying(true)}
                  onPause={() => setPreviewPlaying(false)}
                  onEnded={() => setPreviewPlaying(false)}
                  onTimeUpdate={(e) => {
                    const el = e.currentTarget;
                    if (el.duration) setProgress(el.currentTime / el.duration);
                  }}
                />
                <button
                  type="button"
                  onClick={togglePreview}
                  aria-label={previewPlaying ? "Pause preview" : "Play preview"}
                  className="min-h-11 flex w-full items-center gap-2 py-1 text-left"
                >
                  <span
                    aria-hidden
                    className="w-6 h-6 shrink-0 bg-gradient-to-br from-orange-400 to-pink-500"
                    style={previewPlaying ? PAUSE_MASK_FLUSH : PLAY_MASK_FLUSH}
                  />
                  <span className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                    Previewing &quot;{preview.title}&quot;
                  </span>
                </button>
              </div>
            )}
            <div className="relative -mx-6 -mb-6">
              <form
                id="soul-price-form"
                className="hidden"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitSoulTier();
                }}
              />
              {preview && (
                <div
                  aria-hidden
                  className="absolute top-0 left-0 z-10 h-0.5 bg-gradient-to-r from-orange-400 to-pink-500"
                  style={{ width: `${Math.min(100, progress * 100)}%` }}
                />
              )}
              <div
                ref={tierRowsRef}
                className="border-t-2 border-neutral-200 dark:border-neutral-800 divide-y-2 divide-neutral-200 dark:divide-neutral-800"
              >
              {SUPPORT_AMOUNTS.map((tier, index) => {
                const TierIcon = TIER_ICONS[index];
                const isSoul = tier.name === "Soul";
                const isSelected = selectedTier === tier.name;
                const price = billingPeriod === "annually" ? tier.net * 10 : tier.net;
                const period = billingPeriod === "annually" ? "yr" : "mo";
                const annual = billingPeriod === "annually";
                const soulAmount = parseInt(customAmount, 10);
                const soulMonthlyNet = annual ? soulAmount / 10 : soulAmount;
                const feeLabel = isSoul
                  ? soulAmount > 0
                    ? formatFee(feeCents(soulMonthlyNet, annual))
                    : null
                  : formatFee(feeCents(tier.net, annual));
                return (
                  <button
                    key={tier.name}
                    onClick={() => {
                      stopFlash();
                      setSelectedTier(tier.name);
                      const row = tierRowsRef.current?.children[index] as HTMLElement | undefined;
                      if (row) paintRow(row, index);
                      if (isSoul) {
                        soulPointerRef.current = false;
                        submitSoulTier();
                        return;
                      }
                      handleSubscribe(periodNetCents(tier.net, annual));
                    }}
                    disabled={isLoading || !hydrated}
                    className={`min-h-11 w-full flex items-center gap-3 px-4 py-3 transition-colors group text-left ${
                      isLoading && !isSelected ? "opacity-40" : ""
                    }`}
                    onMouseEnter={(e) => {
                      if (isLoading || tierFlashingRef.current) return;
                      paintRow(e.currentTarget, index);
                    }}
                    onMouseLeave={(e) => {
                      if (isLoading || tierFlashingRef.current) return;
                      clearRow(e.currentTarget, index);
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
                      {isSoul && (
                        <div className="text-neutral-500 dark:text-neutral-400 text-sm">
                          Name your price
                        </div>
                      )}
                    </div>
                    <div className="ml-auto shrink-0 flex flex-col items-end justify-center min-h-[60px]">
                    {isLoading && isSelected ? (
                      <span className="inline-flex items-center gap-1.5 text-sm font-normal tabular-nums">
                        <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Opening checkout
                      </span>
                    ) : (
                      <>
                        <span className="relative text-neutral-900 dark:text-white font-medium text-4xl shrink-0 tabular-nums">
                          {isSoul ? (
                            <>
                              $
                              <span
                                ref={amountSizerRef}
                                aria-hidden
                                className="invisible absolute left-0 top-0 whitespace-pre"
                              >
                                {customAmount || "0"}
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                enterKeyHint="go"
                                form="soul-price-form"
                                value={customAmount}
                                onChange={(e) => {
                                  const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                                  const clamped =
                                    digitsOnly && parseInt(digitsOnly, 10) > MAX_CUSTOM_AMOUNT
                                      ? String(MAX_CUSTOM_AMOUNT)
                                      : digitsOnly;
                                  setCustomAmount(clamped);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                onFocus={(e) => {
                                  e.stopPropagation();
                                  soulPointerRef.current = false;
                                  document.addEventListener("pointerdown", markSoulPointer, true);
                                }}
                                onBlur={() => {
                                  document.removeEventListener("pointerdown", markSoulPointer, true);
                                  if (!document.hasFocus()) return;
                                  submitSoulTier();
                                }}
                                onKeyDown={(e) => {
                                  if (e.key !== "Enter") return;
                                  e.preventDefault();
                                  e.currentTarget.blur();
                                }}
                                className="text-neutral-900 dark:text-white font-medium text-4xl tabular-nums p-0 bg-transparent outline-none border-b-2 border-neutral-300 dark:border-neutral-600 focus:border-neutral-900 dark:focus:border-white text-right"
                                style={{ width: amountWidth ? `${Math.ceil(amountWidth)}px` : undefined }}
                              />
                              <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
                                /{period}
                              </span>
                            </>
                          ) : (
                            <>
                              ${price}
                              <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
                                /{period}
                              </span>
                            </>
                          )}
                        </span>
                        {feeLabel && (
                          <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400 tabular-nums">
                            {feeLabel}
                          </span>
                        )}
                      </>
                    )}
                    </div>
                  </button>
                );
              })}
              </div>
              <p className="border-t border-neutral-200 dark:border-neutral-800 px-6 pt-4 pb-6 text-sm text-neutral-500 dark:text-neutral-400">
                Other platforms take a cut on top of payment processing. Here, you cover processing with no additional costs.
              </p>
            </div>
              </>
            )}
          </div>
          )}
        </div>
      )}
    </>
  );
}
