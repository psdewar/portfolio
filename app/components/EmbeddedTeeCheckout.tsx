"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { XIcon } from "@phosphor-icons/react";
import CheckoutPanel, { CHECKOUT_CARD } from "./CheckoutPanel";
import CheckoutSheet from "./CheckoutSheet";
import { useScrollLock } from "../hooks/useScrollLock";
import { postJson } from "../lib/network-error";

const GOLD = "#d4a553";

interface Props {
  productId: string;
  color: string;
  size: string;
  onClose: () => void;
  accent?: string;
  accentText?: string;
  confirmation?: string;
  crossSellLabel?: string;
  onCrossSell?: () => void;
  checkinId?: string | null;
  onComplete?: () => void;
  sheet?: boolean;
  backLabel?: string;
}

export default function EmbeddedTeeCheckout({
  productId,
  color,
  size,
  onClose,
  accent = GOLD,
  accentText = "#0a0a0a",
  confirmation = "Your Patience tee ships in 5 to 7 business days. Confirmation is in your inbox.",
  crossSellLabel,
  onCrossSell,
  checkinId,
  onComplete,
  sheet = false,
  backLabel = "Back to shop",
}: Props) {
  const [complete, setComplete] = useState(false);

  useScrollLock();

  const fetchClientSecret = useCallback(async () => {
    const res = await postJson("/api/create-checkout-session", {
      productId,
      embedded: true,
      metadata: { color, size, ...(checkinId ? { checkinId } : {}) },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.clientSecret) throw new Error(data.error || "Checkout unavailable");
    return data.clientSecret as string;
  }, [productId, color, size, checkinId]);

  return (
    <CheckoutSheet
      sheet={sheet}
      zIndex={70}
      onClose={onClose}
      label="Checkout"
      wrapClass="fixed inset-0 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      cardClass={
        complete
          ? "relative my-8 w-full max-w-md rounded-2xl bg-white shadow-2xl"
          : `${CHECKOUT_CARD} my-8`
      }
    >
      {complete ? (
        <>
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/80 text-neutral-500 hover:text-neutral-900"
          >
            <XIcon size={20} weight="bold" />
          </button>
          <div className="animate-fade-in px-6 py-16 text-center">
            <h2 className="font-bebas text-5xl" style={{ color: accent }}>
              Order Confirmed
            </h2>
            <p className="mx-auto mt-3 max-w-xs text-neutral-600">{confirmation}</p>
            <div className="mx-auto mt-8 flex max-w-xs flex-col gap-3">
              {onCrossSell && crossSellLabel && (
                <button
                  onClick={onCrossSell}
                  className="rounded-btn px-6 py-3 font-medium"
                  style={{ background: accent, color: accentText }}
                >
                  {crossSellLabel}
                </button>
              )}
              <Link
                href="/listen"
                className="rounded-btn border-2 border-neutral-200 px-6 py-3 font-medium text-neutral-700 transition-colors hover:border-neutral-400"
              >
                Listen while you wait
              </Link>
            </div>
          </div>
        </>
      ) : (
        <CheckoutPanel
          backLabel={backLabel}
          onBack={onClose}
          fetchClientSecret={fetchClientSecret}
          onComplete={() => {
            setComplete(true);
            onComplete?.();
          }}
        />
      )}
    </CheckoutSheet>
  );
}
