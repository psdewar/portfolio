"use client";

import { useCallback, useEffect, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

const PRESETS = [25, 50, 100];

export default function ContributeCardModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState("25");
  const [paying, setPaying] = useState(false);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const cents = Math.round((parseFloat(amount) || 0) * 100);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/contribution-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ key: "tour", amountCents: cents }], trip: "tour" }),
    });
    const { clientSecret } = await res.json();
    return clientSecret;
  }, [cents]);

  return (
    <div
      className="fixed inset-0 z-[950] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Contribute by card"
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-neutral-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
            {complete ? "Thank you" : "Contribute any amount"}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="px-6 pb-6">
          {complete ? (
            <p className="text-xl text-neutral-600 dark:text-neutral-300">
              You&apos;re part of the tour now. I&apos;ll bring you along.
            </p>
          ) : paying ? (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret, onComplete: () => setComplete(true) }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmount(String(p))}
                    className={`py-2.5 rounded-lg border-2 text-xl font-semibold transition-colors ${
                      parseFloat(amount) === p
                        ? "border-neutral-900 dark:border-white text-neutral-900 dark:text-white"
                        : "border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-neutral-400 dark:hover:border-neutral-500"
                    }`}
                  >
                    ${p}
                  </button>
                ))}
              </div>
              <div className="relative mb-5">
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
              <button
                onClick={() => setPaying(true)}
                disabled={cents < 100}
                className="w-full rounded-xl bg-neutral-900 dark:bg-white py-3.5 text-xl font-semibold text-white dark:text-neutral-900 transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
