"use client";

import { useEffect, useRef, useState } from "react";
import CheckoutPanel, { CHECKOUT_SCROLL_CARD, CHECKOUT_WRAP } from "./CheckoutPanel";
import CheckoutSheet from "./CheckoutSheet";
import { useScrollLock } from "../hooks/useScrollLock";
import { useEscape } from "../hooks/useEscape";
import { CHECKOUT_OPEN_ERROR, errorMessage } from "../lib/network-error";

export function useContributeCheckout({
  onClose,
  onPaid,
  redirect,
  presetSecret,
}: {
  onClose: () => void;
  onPaid?: () => void;
  redirect: boolean;
  presetSecret?: string | null;
}) {
  const [secret, setSecret] = useState<string | null>(presetSecret ?? null);
  const [creating, setCreating] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!complete) return;
    const t = setTimeout(() => {
      onCloseRef.current();
      if (redirect) window.location.href = "/support?thanks=tip";
    }, 1500);
    return () => clearTimeout(t);
  }, [complete, redirect]);

  const start = async (create: () => Promise<string>) => {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      setSecret(await create());
    } catch (e) {
      setError(errorMessage(e, CHECKOUT_OPEN_ERROR));
    } finally {
      setCreating(false);
    }
  };

  const paid = () => {
    setComplete(true);
    onPaid?.();
  };

  return { secret, setSecret, creating, complete, error, start, paid };
}

export default function ContributeSheet({
  checkout,
  title,
  label,
  onClose,
  onBack,
  children,
}: {
  checkout: ReturnType<typeof useContributeCheckout>;
  title: string;
  label: string;
  onClose: () => void;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const { secret, complete, error, paid } = checkout;
  const paying = !!secret && !complete;

  useScrollLock();
  useEscape(onClose);

  return (
    <CheckoutSheet
      zIndex={950}
      onClose={onClose}
      label={label}
      wrapClass={
        paying
          ? CHECKOUT_WRAP
          : "fixed inset-0 flex items-end justify-center bg-black/65 backdrop-blur-sm sm:items-center sm:p-4"
      }
      cardClass={
        paying
          ? CHECKOUT_SCROLL_CARD
          : "animate-slide-up-fade max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl dark:bg-neutral-900"
      }
    >
      {paying ? (
        <CheckoutPanel onBack={onBack} fetchClientSecret={() => Promise.resolve(secret)} onComplete={paid} />
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 px-6 pt-5">
            <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">
              {complete ? "Thank you" : title}
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
                {children}
                {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
              </>
            )}
          </div>
        </>
      )}
    </CheckoutSheet>
  );
}
