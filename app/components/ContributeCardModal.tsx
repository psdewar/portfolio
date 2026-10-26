"use client";

import { useState } from "react";
import ContributeSheet, { useContributeCheckout } from "./ContributeSheet";
import { PAYMENT_OPTIONS_STYLE } from "./PaymentOptions";
import { feeCents, cardPayLabel, formatFee, MAX_CARD_DOLLARS } from "../lib/fees";
import { createContributionSecret } from "../lib/contribution-checkout";

const PRESETS = [25, 50, 100];

const clampAmount = (v: string) =>
  parseFloat(v) > MAX_CARD_DOLLARS ? String(MAX_CARD_DOLLARS) : v;

export default function ContributeCardModal({
  onClose,
  checkinId,
  onComplete,
  presetSecret,
}: {
  onClose: () => void;
  checkinId?: string | null;
  onComplete?: () => void;
  presetSecret?: string | null;
}) {
  const [amount, setAmount] = useState("25");
  const checkout = useContributeCheckout({
    onClose,
    onPaid: onComplete,
    redirect: !onComplete,
    presetSecret,
  });
  const { creating, start, setSecret } = checkout;

  const cents = Math.round((parseFloat(amount) || 0) * 100);
  const feeLine = cents >= 100 ? `${formatFee(feeCents(cents))}, so I receive 100%` : "\u00A0";

  const startCheckout = () => start(() => createContributionSecret(cents, checkinId));

  return (
    <ContributeSheet
      checkout={checkout}
      title="Contribute any amount"
      label="Contribute by card"
      onClose={onClose}
      onBack={presetSecret ? onClose : () => setSecret(null)}
    >
      <div className="flex items-center gap-1 min-[360px]:gap-1.5">
        <label className="inline-flex h-[54px] min-w-0 flex-[1.75] items-center gap-1 rounded-lg border border-neutral-300 bg-neutral-100 px-2 min-[360px]:px-2.5 focus-within:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:focus-within:border-white">
          <span className="text-[clamp(1.125rem,9.1vw-10px,1.5rem)] font-bold text-neutral-400">$</span>
          <input
            type="number"
            inputMode="decimal"
            min="1"
            max={MAX_CARD_DOLLARS}
            value={amount}
            placeholder="0"
            onChange={(e) => setAmount(clampAmount(e.target.value))}
            aria-label="Contribution amount"
            className="w-full min-w-0 border-0 bg-transparent p-0 text-right text-[clamp(1.125rem,9.1vw-10px,1.5rem)] font-bold tabular-nums text-neutral-900 outline-none dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
        </label>
        {PRESETS.map((p) => (
          <button
            key={p}
            aria-label={`Add $${p}`}
            onClick={() => setAmount(clampAmount(String((parseFloat(amount) || 0) + p)))}
            className="h-[54px] min-w-0 flex-1 whitespace-nowrap rounded-lg border-[1.5px] border-neutral-300 inline-flex items-center justify-center gap-0.5 px-0 text-neutral-900 transition active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a553] dark:border-neutral-600 dark:text-white [@media(hover:hover)]:hover:border-neutral-900 [@media(hover:hover)]:hover:bg-neutral-900 [@media(hover:hover)]:hover:text-white dark:[@media(hover:hover)]:hover:border-white dark:[@media(hover:hover)]:hover:bg-white dark:[@media(hover:hover)]:hover:text-neutral-900"
          >
            <span className="text-[clamp(1.125rem,9.1vw-10px,1.5rem)] font-semibold opacity-60">+</span>
            <span className="text-[clamp(1.125rem,9.1vw-10px,1.5rem)] font-bold tabular-nums">{p}</span>
          </button>
        ))}
      </div>
      <div className="mb-3 mt-2 text-sm font-medium tabular-nums text-neutral-600 dark:text-neutral-300">
        {feeLine}
      </div>
      <button
        className="cc-btn cc-card !mb-0"
        onClick={startCheckout}
        disabled={cents < 100 || creating}
        style={cents < 100 ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
      >
        {creating ? (
          <>
            <span className="cc-spinner" />
            Opening checkout
          </>
        ) : (
          cents < 100 ? "Pay with your card" : cardPayLabel(cents)
        )}
      </button>
      <style>{PAYMENT_OPTIONS_STYLE}</style>
    </ContributeSheet>
  );
}
