"use client";

import { useCallback, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { XIcon } from "@phosphor-icons/react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");
const GOLD = "#d4a553";

interface Props {
  productId: string;
  color: string;
  size: string;
  onClose: () => void;
}

export default function EmbeddedTeeCheckout({ productId, color, size, onClose }: Props) {
  const [complete, setComplete] = useState(false);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, embedded: true, metadata: { color, size } }),
    });
    const { clientSecret } = await res.json();
    return clientSecret;
  }, [productId, color, size]);

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative my-8 w-full max-w-md rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-1.5 text-neutral-500 hover:text-neutral-900"
        >
          <XIcon size={20} weight="bold" />
        </button>
        {complete ? (
          <div className="animate-fade-in px-6 py-16 text-center">
            <h2 className="font-bebas text-5xl" style={{ color: GOLD }}>
              Order Confirmed
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-neutral-600">
              Your Patience tee ships in 2-5 weeks. Confirmation is in your inbox.
            </p>
            <button
              onClick={onClose}
              className="mt-8 rounded-xl px-6 py-3 font-medium text-[#0a0a0a]"
              style={{ background: GOLD }}
            >
              Keep looking around
            </button>
          </div>
        ) : (
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ fetchClientSecret, onComplete: () => setComplete(true) }}
          >
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        )}
      </div>
    </div>
  );
}
