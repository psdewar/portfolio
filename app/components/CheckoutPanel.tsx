"use client";

import { ArrowLeftIcon } from "@phosphor-icons/react";
import CheckoutEmbed from "./CheckoutEmbed";

export const CHECKOUT_CARD =
  "relative w-full max-w-[428px] rounded-2xl bg-white dark:bg-neutral-900 py-6 shadow-xl";

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
      <div className="relative z-10 flex items-center px-6">
        <button
          type="button"
          onClick={onBack}
          className="min-h-11 -mx-3 px-3 inline-flex items-center gap-2 text-left text-base font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" weight="bold" />
          {backLabel}
        </button>
      </div>
      <div className="-mt-3">
        <CheckoutEmbed
          fetchClientSecret={fetchClientSecret}
          onComplete={onComplete}
        />
      </div>
    </>
  );
}
