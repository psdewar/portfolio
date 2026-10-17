"use client";

import { useState } from "react";
import posthog from "posthog-js";
import { useHydrated } from "../hooks/useHydrated";
import { useScrollLock } from "../hooks/useScrollLock";
import { useSession } from "../hooks/useSession";
import { PATRON_TIERS } from "../data/patron-tiers";
import { grossUpCents, formatCents, MAX_CARD_CENTS } from "../lib/fees";

export const PICKER_TIERS = [...PATRON_TIERS].reverse();
export const MAX_CUSTOM_AMOUNT = MAX_CARD_CENTS / 100;
export const MIN_CUSTOM_AMOUNT = PATRON_TIERS[PATRON_TIERS.length - 1].net;

const periodNetCents = (monthlyNetDollars: number, annual: boolean) =>
  Math.round(monthlyNetDollars * (annual ? 1000 : 100));

export const SUPPORT_AMOUNTS = PICKER_TIERS.map((tier) => ({
  net: tier.net,
  name: tier.name,
  hint: tier.hint,
}));

const DEFAULT_TIER = Math.max(0, SUPPORT_AMOUNTS.findIndex((t) => t.name === "Flow"));

type Period = "monthly" | "annually";

export function useMonthlySupport({ source, checkinId }: { source: string; checkinId?: string | null }) {
  const hydrated = useHydrated();
  const { session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(DEFAULT_TIER);
  const [checkoutSecret, setCheckoutSecret] = useState<string | null>(null);
  const [billingPeriod, setBillingPeriod] = useState<Period>("monthly");
  const [customAmount, setCustomAmount] = useState(String(MIN_CUSTOM_AMOUNT));
  useScrollLock(!!checkoutSecret);

  const annual = billingPeriod === "annually";
  const selectedTier = SUPPORT_AMOUNTS[selectedIndex];
  const selectedIsSoul = selectedTier.name === "Soul";
  const soulMinimum = annual ? MIN_CUSTOM_AMOUNT * 10 : MIN_CUSTOM_AMOUNT;
  const soulBelowMinimum = !(parseInt(customAmount, 10) >= soulMinimum);
  const soulAmountNum = parseInt(customAmount, 10) || 0;
  const selectedNetCents = selectedIsSoul ? soulAmountNum * 100 : periodNetCents(selectedTier.net, annual);
  const payLabel = `Pay ${formatCents(grossUpCents(selectedNetCents))}/${annual ? "year" : "month"} with your card`;

  const startCheckout = async (netAmount: number, period: Period) => {
    setIsLoading(true);
    const finalAmount = grossUpCents(netAmount);
    const interval = period === "annually" ? "year" : "month";
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
          ...(checkinId ? { checkinId } : {}),
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

  const submit = (onBelowMinimum: () => void) => {
    if (isLoading || !hydrated) return;
    if (selectedIsSoul && soulBelowMinimum) {
      onBelowMinimum();
      return;
    }
    posthog.capture("patron_tier_selected", {
      amount_cents: grossUpCents(selectedNetCents),
      billing_period: billingPeriod,
      is_logged_in: !!session,
      source,
    });
    startCheckout(selectedNetCents, billingPeriod);
  };

  const toggleBilling = () => {
    const next: Period = annual ? "monthly" : "annually";
    setBillingPeriod(next);
    setCustomAmount((prev) => {
      const net = parseInt(prev, 10);
      if (!net) return prev;
      return (next === "annually" ? net * 10 : Math.round(net / 10)).toString();
    });
  };

  const reset = () => {
    setSelectedIndex(DEFAULT_TIER);
    setCheckoutSecret(null);
  };

  return {
    hydrated,
    isLoading,
    selectedIndex,
    setSelectedIndex,
    billingPeriod,
    toggleBilling,
    customAmount,
    setCustomAmount,
    soulMinimum,
    soulBelowMinimum,
    payLabel,
    checkoutSecret,
    closeCheckout: () => setCheckoutSecret(null),
    submit,
    reset,
  };
}
