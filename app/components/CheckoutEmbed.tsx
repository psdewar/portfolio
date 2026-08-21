"use client";

import { useEffect, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe } from "../lib/stripeClient";

let activeCheckouts = 0;

export default function CheckoutEmbed({
  fetchClientSecret,
  onComplete,
}: {
  fetchClientSecret: () => Promise<string>;
  onComplete: () => void;
}) {
  const [slotClaimed, setSlotClaimed] = useState(false);
  const [stripePromise, setStripePromise] = useState(() => getStripe());
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let claimed = false;
    let timer: ReturnType<typeof setTimeout>;
    const claim = () => {
      if (activeCheckouts === 0) {
        activeCheckouts += 1;
        claimed = true;
        setSlotClaimed(true);
      } else {
        timer = setTimeout(claim, 150);
      }
    };
    claim();
    return () => {
      clearTimeout(timer);
      if (claimed) activeCheckouts -= 1;
    };
  }, []);

  useEffect(() => {
    let stale = false;
    stripePromise.catch(() => {
      if (!stale) setLoadFailed(true);
    });
    return () => {
      stale = true;
    };
  }, [stripePromise]);

  if (loadFailed) {
    return (
      <div className="px-6 py-10 text-center">
        <p className="text-neutral-600 dark:text-neutral-300">
          Card checkout couldn't load. Check your connection and try again, or use Venmo or Zelle.
        </p>
        <button
          onClick={() => {
            setLoadFailed(false);
            setStripePromise(getStripe());
          }}
          className="mt-5 rounded-xl bg-neutral-900 px-6 py-3 font-medium text-white dark:bg-white dark:text-neutral-900"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!slotClaimed) {
    return (
      <div className="flex justify-center px-6 py-12">
        <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-neutral-200 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white" />
      </div>
    );
  }

  return (
    <EmbeddedCheckoutProvider stripe={stripePromise} options={{ fetchClientSecret, onComplete }}>
      <EmbeddedCheckout />
    </EmbeddedCheckoutProvider>
  );
}
