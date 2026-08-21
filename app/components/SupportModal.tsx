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
import { TIER_ELEMENTS } from "../data/patron-config";
import StayConnected from "./StayConnected";

const TIER_ICONS = [PencilIcon, WavesIcon, LightbulbIcon, FireIcon];
const TIER_COLORS = ["#f97316", "#f56542", "#f0566d", "#ec4899"];

const TIER_NAMES = ["Pen", "Flow", "Mind", "Soul"];
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
  source: string;
  absoluteOverlay?: boolean;
}

export default function SupportModal({
  open,
  onOpenChange,
  source,
  absoluteOverlay = false,
}: SupportModalProps) {
  const hydrated = useHydrated();
  const [isLoading, setIsLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annually">("monthly");

  const tierFlashedRef = useRef(false);
  const tierFlashingRef = useRef(false);
  const tierRowsRef = useRef<HTMLDivElement>(null);

  const tierModal = useModalStage(open);
  const authModal = useModalStage(showAuthModal);

  useEffect(() => {
    if (!open || tierFlashedRef.current) return;
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

  const authTier = authModal.mounted
    ? SUPPORT_AMOUNTS.find((t) => t.chargeCents === pendingAmount)
    : undefined;
  const authSavedPeriod = authModal.mounted
    ? (sessionStorage.getItem("pendingPatronPeriod") as "monthly" | "annually" | null)
    : null;
  const authPeriod = authSavedPeriod || billingPeriod;

  return (
    <>
      {tierModal.mounted && (
        <div
          className={`t-modal-backdrop ${tierModal.stageClass} ${absoluteOverlay ? "absolute" : "fixed"} inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4`}
          onClick={() => onOpenChange(false)}
        >
          <div
            ref={tierModal.ref}
            className={`t-modal ${tierModal.stageClass} bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-md w-full shadow-xl max-h-full overflow-y-auto`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bebas text-2xl text-neutral-900 dark:text-white">
                Become a Monthly Supporter
              </h3>
              <button
                onClick={() => onOpenChange(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
              >
                <XIcon className="w-4 h-4 text-neutral-500" weight="bold" />
              </button>
            </div>
            <p className="text-base text-neutral-500 dark:text-neutral-400 mb-4">
              Everyone who joins gets the same unreleased music, behind-the-scenes videos and more.
              Give what you can!
            </p>
            <div className="flex items-center justify-start mb-4 text-base">
              <button
                onClick={() =>
                  setBillingPeriod(billingPeriod === "monthly" ? "annually" : "monthly")
                }
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
            <div
              ref={tierRowsRef}
              className="-mx-6 -mb-6 border-t-2 border-neutral-200 dark:border-neutral-800 divide-y-2 divide-neutral-200 dark:divide-neutral-800"
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
          </div>
        </div>
      )}

      {authModal.mounted && (
        <div
          className={`t-modal-backdrop ${authModal.stageClass} fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4`}
        >
          <div ref={authModal.ref} className={`t-modal ${authModal.stageClass}`}>
            <StayConnected
              isModal
              onChangeTier={() => {
                setShowAuthModal(false);
                setPendingAmount(null);
                sessionStorage.removeItem("pendingPatronAmount");
                sessionStorage.removeItem("pendingPatronPeriod");
                onOpenChange(true);
              }}
              selectedTier={
                authTier
                  ? {
                      name: authTier.name,
                      amount: authPeriod === "annually" ? authTier.net * 10 : authTier.net,
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
        </div>
      )}
    </>
  );
}
