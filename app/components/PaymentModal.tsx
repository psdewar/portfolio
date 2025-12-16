"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { stripePromise, STRIPE_CONFIG } from "../lib/stripe";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackTitle: string;
  trackId: string;
  trackThumbnail?: string;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  trackTitle,
  trackId,
  trackThumbnail,
}) => {
  const [customAmount, setCustomAmount] = useState("1.99");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close modal with escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const handlePayment = async (amountInCents: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: trackId, // trackId === productId for individual singles
          amount: amountInCents,
          metadata: {
            trackTitle,
          },
        }),
      });

      const { sessionId, error: serverError } = await response.json();

      if (serverError) {
        throw new Error(serverError);
      }

      // Redirect to Stripe Checkout
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId,
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedAmount = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
    handlePayment(amount);
  };

  const handleCustomAmount = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < STRIPE_CONFIG.minimumAmount / 100) {
      setError(`Minimum amount is $${STRIPE_CONFIG.minimumAmount / 100}`);
      return;
    }

    const amountInCents = Math.round(amount * 100);
    setSelectedAmount(amountInCents);
    handlePayment(amountInCents);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white dark:bg-neutral-900 rounded-xl shadow-2xl max-w-md w-full p-6">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-black/10 dark:hover:bg-white/10 rounded-full transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* Track info */}
          <div className="flex items-center gap-3 mb-6">
            {trackThumbnail && (
              <div className="w-16 h-16 overflow-hidden bg-neutral-200 dark:bg-neutral-800">
                <Image
                  src={trackThumbnail}
                  alt={trackTitle}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-medium text-lg text-neutral-900 dark:text-white">{trackTitle}</h3>
              <p className="font-bebas text-base text-neutral-600 dark:text-neutral-400 tracking-tight">Peyt Spencer</p>
            </div>
          </div>

          {/* Payment options */}
          <div className="space-y-4">
            <div>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-900 dark:text-white font-medium">
                    Download Track
                  </span>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                  High-quality MP3 download - name your price
                </p>
              </div>

              {/* Suggested amounts */}
              <div>
                <h4 className="text-sm font-medium text-neutral-900 dark:text-white mb-3">
                  Choose an amount:
                </h4>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {STRIPE_CONFIG.suggestedAmounts.map(({ amount, tier }) => (
                    <button
                      key={amount}
                      onClick={() => handleSuggestedAmount(amount)}
                      disabled={isLoading}
                      className="px-4 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-300 dark:hover:border-green-700 border border-neutral-200 dark:border-neutral-700 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {tier}
                      <br />${(amount / 100).toFixed(2)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-neutral-900 text-neutral-500">or</span>
                </div>
              </div>

              {/* Custom amount */}
              <div>
                <label className="block text-sm font-medium text-neutral-900 dark:text-white mb-2">
                  Custom amount:
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                      $
                    </span>
                    <input
                      type="number"
                      value={Number(customAmount).toFixed(2)}
                      onChange={(e) => {
                        setCustomAmount(e.target.value);
                        setError(null);
                      }}
                      placeholder={"1.99"}
                      min={STRIPE_CONFIG.minimumAmount / 100}
                      step="1"
                      className="w-full pl-8 pr-4 py-3 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    onClick={handleCustomAmount}
                    disabled={isLoading || !customAmount}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        Purchase & Download
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs text-neutral-500 text-center">
              Powered by Stripe • Secure payment processing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
