"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import CheckoutEmbed from "./CheckoutEmbed";

export const CHECKOUT_CARD =
  "relative w-full max-w-[428px] rounded-2xl bg-white dark:bg-neutral-900 py-6 shadow-xl";

export const CHECKOUT_WRAP =
  "fixed inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4";
export const CHECKOUT_SCROLL_CARD = `${CHECKOUT_CARD} max-h-full overflow-y-auto`;

export function CheckoutBack({ label = "Back", onBack }: { label?: string; onBack: () => void }) {
  return (
    <div className="relative z-10 flex items-center px-6">
      <button
        type="button"
        onClick={onBack}
        className="min-h-11 -mx-3 px-3 inline-flex items-center gap-2 text-left text-base font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" weight="bold" />
        {label}
      </button>
    </div>
  );
}

export default function CheckoutPanel({
  backLabel = "Back",
  onBack,
  fetchClientSecret,
  onComplete,
}: {
  backLabel?: string;
  onBack: () => void;
  fetchClientSecret: () => Promise<string>;
  onComplete: () => void;
}) {
  return (
    <>
      <CheckoutBack label={backLabel} onBack={onBack} />
      <div>
        <CheckoutEmbed
          fetchClientSecret={fetchClientSecret}
          onComplete={onComplete}
        />
      </div>
    </>
  );
}
