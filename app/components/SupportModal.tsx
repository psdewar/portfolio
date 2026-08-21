"use client";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";
import {
  XIcon,
  CheckIcon,
  PencilIcon,
  WavesIcon,
  LightbulbIcon,
  FireIcon,
} from "@phosphor-icons/react";
import { useHydrated } from "../hooks/useHydrated";
import StayConnected from "./StayConnected";
import { PLAY_MASK_FLUSH, PAUSE_MASK_FLUSH } from "../lib/glyph-masks";

const TIER_ICONS = [PencilIcon, WavesIcon, LightbulbIcon, FireIcon];
const TIER_COLORS = ["#f97316", "#f56542", "#f0566d", "#ec4899"];

const TIER_NAMES = ["Pen", "Flow", "Mind", "Soul"];
const MAX_CUSTOM_AMOUNT = 100000;

const grossUpCents = (net: number) => Math.round(Math.ceil(((net + 0.3) / 0.971) * 100));
const SUPPORT_AMOUNTS = [5, 10, 25, 50].map((net, i) => {
  const charge = Math.ceil(((net + 0.3) / 0.971) * 100) / 100;
  return { net, charge, chargeCents: Math.round(charge * 100), name: TIER_NAMES[i] };
});

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [pendingTier, setPendingTier] = useState<{ name: string; amount: number } | null>(
    null,
  );
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">("monthly");
  const [customAmount, setCustomAmount] = useState("50");
  const amountSizerRef = useRef<HTMLSpanElement>(null);
  const [amountWidth, setAmountWidth] = useState(0);
  const soulPointerRef = useRef(false);
  const markSoulPointer = useRef(() => {
    soulPointerRef.current = true;
  }).current;

  const tierFlashedRef = useRef(false);
  const tierFlashingRef = useRef(false);
  const tierRowsRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const previewPlayedRef = useRef<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [previewStarted, setPreviewStarted] = useState(false);
  const [previewPlaying, setPreviewPlaying] = useState(false);

  const tierModal = useModalStage(open);
  const authModal = useModalStage(showAuthModal);
  const backdropStage = useModalStage(open || showAuthModal);

  useEffect(() => {
    const el = amountSizerRef.current;
    if (!el) return;
    setAmountWidth(el.getBoundingClientRect().width);
  }, [customAmount, open, tierModal.mounted, billingPeriod]);

  useEffect(() => {
    if (!open || !tierModal.mounted || (preview && !previewStarted) || tierFlashedRef.current) return;
    const rows = tierRowsRef.current?.querySelectorAll("button");
    if (!rows || rows.length === 0) return;
    tierFlashedRef.current = true;
    tierFlashingRef.current = true;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
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
        timeouts.push(
          setTimeout(
            () => {
              tierFlashingRef.current = false;
              const i = cached.findIndex(({ el }) => el.matches(":hover"));
              if (i >= 0) {
                cached[i].el.style.backgroundColor = TIER_COLORS[i];
                cached[i].children.forEach((c) => (c.style.color = "white"));
              }
            },
            fadeStart + cached.length * 400 + 300,
          ),
        );
      }, 500),
    );
    return () => {
      tierFlashingRef.current = false;
      timeouts.forEach(clearTimeout);
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
  }, [open]);

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

  const handleSubscribe = (amountCents: number, period: "monthly" | "annually" = billingPeriod) => {
    const name = localStorage.getItem("liveCommenterName");

    posthog.capture("patron_tier_selected", {
      amount_cents: amountCents,
      billing_period: period,
      is_logged_in: !!name,
      source,
    });

    if (!name) {
      setPendingAmount(amountCents);
      sessionStorage.setItem("pendingPatronAmount", amountCents.toString());
      sessionStorage.setItem("pendingPatronPeriod", period);
      onOpenChange(false);
      setShowAuthModal(true);
      return;
    }

    proceedToCheckout(amountCents, period);
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
    if (!net || net < 1) return;
    soulPointerRef.current = true;
    const monthlyNet = billingPeriod === "annually" ? net / 10 : net;
    setPendingTier({ name: "Soul", amount: net });
    handleSubscribe(grossUpCents(monthlyNet), billingPeriod);
  };

  const authSavedPeriod = authModal.mounted
    ? (sessionStorage.getItem("pendingPatronPeriod") as "monthly" | "annually" | null)
    : null;
  const authPeriod = authSavedPeriod || billingPeriod;

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
            className={`t-modal ${tierModal.stageClass} ${authModal.mounted ? "absolute" : ""} bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-xl max-h-full overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bebas text-2xl text-neutral-900 dark:text-white">
                Choose a Tier
              </h3>
              <button
                onClick={dismissTierModal}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
              >
                <XIcon className="w-4 h-4 text-neutral-500" weight="bold" />
              </button>
            </div>
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
                className="w-full text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors py-2 flex items-center gap-2"
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
                  className="flex w-full items-center gap-2 py-1 text-left"
                >
                  <span
                    aria-hidden
                    className="w-6 h-6 shrink-0 bg-gradient-to-br from-orange-400 to-pink-500"
                    style={previewPlaying ? PAUSE_MASK_FLUSH : PLAY_MASK_FLUSH}
                  />
                  <span className="truncate text-sm font-medium text-neutral-900 dark:text-white">
                    {preview.title}
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
                const price = billingPeriod === "annually" ? tier.net * 10 : tier.net;
                const period = billingPeriod === "annually" ? "yr" : "mo";
                return (
                  <button
                    key={tier.name}
                    onClick={() => {
                      if (isSoul) {
                        soulPointerRef.current = false;
                        submitSoulTier();
                        return;
                      }
                      setPendingTier({ name: tier.name, amount: price });
                      handleSubscribe(tier.chargeCents);
                    }}
                    disabled={isLoading || !hydrated}
                    className="w-full flex items-center gap-3 px-4 py-3 transition-colors group text-left"
                    onMouseEnter={(e) => {
                      if (tierFlashingRef.current) return;
                      e.currentTarget.style.backgroundColor = TIER_COLORS[index];
                      e.currentTarget
                        .querySelectorAll("*")
                        .forEach((el) => ((el as HTMLElement).style.color = "white"));
                    }}
                    onMouseLeave={(e) => {
                      if (tierFlashingRef.current) return;
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
                      {isSoul && (
                        <div className="text-neutral-500 dark:text-neutral-400 text-sm">
                          Name your price
                        </div>
                      )}
                    </div>
                    <span className="relative text-neutral-900 dark:text-white font-medium text-4xl shrink-0 tabular-nums ml-auto">
                      {isLoading ? (
                        <span className="w-5 h-5 border-2 border-neutral-300 dark:border-neutral-600 border-t-neutral-900 dark:border-t-white rounded-full animate-spin inline-block" />
                      ) : isSoul ? (
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
                  </button>
                );
              })}
              </div>
            </div>
          </div>
          )}

          {authModal.mounted && (
          <div ref={authModal.ref} className={`t-modal ${authModal.stageClass} w-full max-w-md flex justify-center`}>
            <StayConnected
              isModal
              onChangeTier={() => {
                setShowAuthModal(false);
                setPendingAmount(null);
                    setPendingTier(null);
                sessionStorage.removeItem("pendingPatronAmount");
                sessionStorage.removeItem("pendingPatronPeriod");
                onOpenChange(true);
              }}
              selectedTier={
                pendingTier
                  ? {
                      name: pendingTier.name,
                      amount: pendingTier.amount,
                      period: authPeriod,
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
                    setPendingTier(null);
                    proceedToCheckout(amount, savedPeriod || billingPeriod, email);
                    return;
                  }
                }
                setPendingAmount(null);
                    setPendingTier(null);
                sessionStorage.removeItem("pendingPatronAmount");
                sessionStorage.removeItem("pendingPatronPeriod");
              }}
              shouldShow={true}
            />
          </div>
          )}
        </div>
      )}
    </>
  );
}
