"use client";

import { useEffect } from "react";
import PaymentOptions from "./PaymentOptions";

export function venmoPayUrl(amount: number | string, note: string) {
  return `https://venmo.com/psdewar?txn=pay&audience=private&amount=${amount}&note=${encodeURIComponent(note)}`;
}

export default function PaymentModal({
  venmoUrl,
  onCard,
  onClose,
  label,
  amount,
  hint,
  error,
  zelle = true,
}: {
  venmoUrl: string;
  onCard: () => void;
  onClose: () => void;
  label?: string;
  amount?: string;
  hint?: string;
  error?: string;
  zelle?: boolean;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const labelParts = (label ?? "").split(" · ").filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-[950] flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Payment options"
        className="animate-slide-up-fade max-h-[92vh] w-full max-w-md overflow-y-auto bg-white shadow-2xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3.5">
              {amount && (
                <span className="font-bebas text-5xl leading-none text-neutral-900 dark:text-white">
                  {amount}
                </span>
              )}
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-neutral-800 dark:text-neutral-100">
                  {labelParts[0] ?? "Payment"}
                </span>
                {labelParts.length > 1 && (
                  <span className="truncate text-sm text-neutral-400 dark:text-neutral-500">
                    {labelParts.slice(1).join(" · ")}
                  </span>
                )}
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a553] dark:hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="mt-4 border-t-2 border-dashed border-neutral-300 dark:border-neutral-700" />
        <div className="px-6 pb-5 pt-4">
          {hint && <p className="mb-4 text-sm text-neutral-500 dark:text-neutral-400">{hint}</p>}
          {error && <p className="mb-4 text-sm text-red-500">{error}</p>}
          <PaymentOptions venmoUrl={venmoUrl} onCard={onCard} zelle={zelle} />
          <p className="mt-1 text-center text-[11px] uppercase tracking-[0.2em] text-neutral-400 dark:text-neutral-500">
            Thank you for supporting independent music
          </p>
        </div>
      </div>
    </div>
  );
}
