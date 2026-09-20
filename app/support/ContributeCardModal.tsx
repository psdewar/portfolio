"use client";

import { useEffect, useRef, useState } from "react";
import { XIcon, ArrowLeftIcon } from "@phosphor-icons/react";
import CheckoutEmbed from "../components/CheckoutEmbed";
import { grossUpCents, feeCents, formatFee } from "../lib/fees";

const PRESETS = [25, 50, 100];

export default function ContributeCardModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("25");
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!complete) return;
    const t = setTimeout(() => {
      onCloseRef.current();
      window.location.href = "/support?thanks=tip";
    }, 1500);
    return () => clearTimeout(t);
  }, [complete]);

  const cents = Math.round((parseFloat(amount) || 0) * 100);

  const startCheckout = async () => {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/contribution-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [{ key: "support", amountCents: grossUpCents(cents) }],
          trip: "tour",
          feeIncluded: true,
        }),
      });
      if (!res.ok) throw new Error("failed");
      const { clientSecret } = await res.json();
      if (!clientSecret) throw new Error("failed");
      setSecret(clientSecret);
    } catch {
      setError("Checkout couldn't open. Try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[950] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Contribute by card"
        className={`w-full max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 shadow-xl ${secret ? "max-w-lg" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          {secret && !complete ? (
            <button
              type="button"
              onClick={() => setSecret(null)}
              className="min-h-11 inline-flex items-center gap-2 text-left text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeftIcon className="w-4 h-4" weight="bold" />
              Back
            </button>
          ) : (
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {complete ? "Thank you" : "Contribute any amount"}
            </h3>
          )}
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-11 h-11 rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center transition-colors"
          >
            <XIcon className="w-4 h-4 text-neutral-500" weight="bold" />
          </button>
        </div>
        <div className="px-6 pb-6">
          {complete ? (
            <div className="flex flex-col items-center gap-4 py-2">
              <p className="text-xl text-neutral-600 dark:text-neutral-300">Find me on socials</p>
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-neutral-200 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white" />
            </div>
          ) : secret ? (
            <div className="pt-3">
              <CheckoutEmbed
                fetchClientSecret={() => Promise.resolve(secret)}
                onComplete={() => setComplete(true)}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(String(p))}
                    className={`min-h-11 py-2.5 rounded-lg border-2 text-xl font-semibold transition-colors ${
                      parseFloat(amount) === p
                        ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                        : "border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500"
                    }`}
                  >
                    ${p}
                  </button>
                ))}
              </div>
              <div className="relative mb-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xl text-neutral-400">$</span>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-label="Contribution amount"
                  className="w-full pl-7 pr-3 py-2.5 rounded-lg border-2 border-neutral-200 dark:border-neutral-700 bg-transparent text-xl text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-white"
                />
              </div>
              <div className="text-right text-sm text-neutral-500 dark:text-neutral-400 tabular-nums mb-4">
                {cents >= 100 ? formatFee(feeCents(cents)) : " "}
              </div>
              <button
                onClick={startCheckout}
                disabled={cents < 100 || creating}
                className="w-full rounded-xl bg-neutral-900 dark:bg-white py-3.5 text-xl font-semibold text-white dark:text-neutral-900 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Opening checkout
                  </>
                ) : (
                  "Continue"
                )}
              </button>
              {error && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <div className="-mx-6 -mb-6">
                <p className="border-t border-neutral-200 dark:border-neutral-800 px-6 pt-4 pb-6 text-sm text-neutral-500 dark:text-neutral-400">
                  Other platforms take a cut on top of payment processing. Here, you cover processing with no additional costs.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
