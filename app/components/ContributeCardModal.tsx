"use client";

import { useEffect, useRef, useState } from "react";
import CheckoutPanel from "./CheckoutPanel";
import CheckoutSheet from "./CheckoutSheet";
import { PAYMENT_OPTIONS_STYLE } from "./PaymentOptions";
import { useScrollLock } from "../hooks/useScrollLock";
import { grossUpCents, feeCents, formatDollars, formatFee, MAX_CARD_CENTS } from "../lib/fees";

const PRESETS = [25, 50, 100];

const clampAmount = (v: string) =>
  parseFloat(v) > MAX_CARD_CENTS / 100 ? String(MAX_CARD_CENTS / 100) : v;

export default function ContributeCardModal({
  onClose,
  checkinId,
  onComplete,
}: {
  onClose: () => void;
  checkinId?: string | null;
  onComplete?: () => void;
}) {
  const [amount, setAmount] = useState("25");
  const [creating, setCreating] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  useScrollLock();

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
      if (!onComplete) window.location.href = "/support?thanks=tip";
    }, 1500);
    return () => clearTimeout(t);
  }, [complete]);

  const cents = Math.round((parseFloat(amount) || 0) * 100);
  const feeLine = cents >= 100 ? `${formatFee(feeCents(cents))}, so I receive 100%` : "\u00A0";

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
          ...(checkinId ? { checkinId } : {}),
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
    <CheckoutSheet
      zIndex={950}
      onClose={onClose}
      label="Contribute by card"
      wrapClass="fixed inset-0 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      cardClass={`animate-slide-up-fade max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-neutral-900${
        secret && !complete ? " py-6" : ""
      }`}
    >
      {secret && !complete ? (
        <CheckoutPanel
          onBack={() => setSecret(null)}
          fetchClientSecret={() => Promise.resolve(secret)}
          onComplete={() => {
            setComplete(true);
            onComplete?.();
          }}
        />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 px-6 pt-5">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {complete ? "Thank you" : "Contribute any amount"}
            </h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="-my-2 -mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-black/5 text-neutral-500 transition-colors dark:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a553] [@media(hover:hover)]:hover:text-neutral-900 dark:[@media(hover:hover)]:hover:text-white"
            >
              &#x2715;
            </button>
          </div>
          <div className="px-6 pb-5 pt-4">
            {complete ? (
              <div className="flex flex-col items-center gap-4 py-2">
                <p className="text-xl text-neutral-600 dark:text-neutral-300">Find me on socials</p>
                <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-neutral-200 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white" />
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <label className="inline-flex h-[54px] flex-1 items-center gap-1 rounded-lg border border-neutral-300 bg-neutral-100 px-2 min-[360px]:px-2.5 focus-within:border-neutral-900 dark:border-neutral-700 dark:bg-neutral-800 dark:focus-within:border-white">
                    <span className="text-2xl font-bold text-neutral-400">$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      max={MAX_CARD_CENTS / 100}
                      value={amount}
                      placeholder="0"
                      onChange={(e) => setAmount(clampAmount(e.target.value))}
                      aria-label="Contribution amount"
                      className="w-full min-w-[4ch] min-[360px]:min-w-[5.5ch] border-0 bg-transparent p-0 text-right text-2xl font-bold tabular-nums text-neutral-900 outline-none dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                  </label>
                  {PRESETS.map((p) => (
                    <button
                      key={p}
                      aria-label={`Add $${p}`}
                      onClick={() => setAmount(clampAmount(String((parseFloat(amount) || 0) + p)))}
                      className="h-[54px] min-w-0 flex-1 whitespace-nowrap rounded-lg border-[1.5px] border-neutral-300 inline-flex items-center justify-center gap-0.5 px-0 text-neutral-900 transition active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4a553] dark:border-neutral-600 dark:text-white [@media(hover:hover)]:hover:border-neutral-900 [@media(hover:hover)]:hover:bg-neutral-900 [@media(hover:hover)]:hover:text-white dark:[@media(hover:hover)]:hover:border-white dark:[@media(hover:hover)]:hover:bg-white dark:[@media(hover:hover)]:hover:text-neutral-900"
                    >
                      <span className="text-2xl font-semibold opacity-60">+</span>
                      <span className="text-2xl font-bold tabular-nums">{p}</span>
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
                    cents < 100 ? "Pay with your card" : `Pay ${formatDollars(grossUpCents(cents))} with your card`
                  )}
                </button>
                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
                <style>{PAYMENT_OPTIONS_STYLE}</style>
              </>
            )}
          </div>
        </>
      )}
    </CheckoutSheet>
  );
}
