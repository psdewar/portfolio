"use client";

import { useState } from "react";
import { ProgressBar } from "app/components/ProgressBar";
import { stripePromise } from "app/lib/stripe";
import { VideoPlayButtonWithContext } from "app/components/VideoPlayButtonWithContext";

interface FundingCardProps {
  raisedCents: number;
  goalCents: number;
  backers: number;
  tierCounts?: Record<string, number>;
  title: string;
  projectId: string;
  contributeTitle: string | null;
  details: string;
  stretch?: Record<string, any> | null;
}

export function FundingCard({
  raisedCents,
  goalCents,
  backers,
  tierCounts,
  title,
  projectId,
  contributeTitle,
  details,
  stretch,
}: FundingCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [customAmount, setCustomAmount] = useState("15");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);

  const paymentOptions = [
    { amount: 1000, label: "keep going" },
    { amount: 2500, label: "your music is great" },
    { amount: 5000, label: "you're a top-notch artist" },
    {
      amount: 10000,
      label: "your live show is must-see",
    },
  ];

  const handlePayment = async (amountInCents: number) => {
    setIsLoading(true);
    setSelectedAmount(amountInCents);

    try {
      const response = await fetch("/api/fund-project", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectTitle: title,
          projectId,
          amount: amountInCents,
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
    } catch (error) {
      console.error("Error creating checkout session:", error);
      alert("There was an error processing your request. Please try again.");
    } finally {
      setIsLoading(false);
      setSelectedAmount(null);
    }
  };

  const handleCustomAmount = () => {
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount < 10) {
      alert("Minimum amount is $10.00");
      return;
    }

    const amountInCents = Math.round(amount * 100);
    handlePayment(amountInCents);
  };

  const hitPrimary = raisedCents >= goalCents;

  return (
    <div className="bg-white dark:bg-gray-800 transition-colors rounded-lg p-6 min-h-[600px] max-w-[600px]">
      <div className="mb-6">
        <ProgressBar
          current={raisedCents}
          goal={goalCents}
          stretch={stretch?.goalCents ? { goalCents: stretch.goalCents } : null}
        />
      </div>
      <div className="mb-6 grid grid-cols-3 items-start">
        <div className="col-span-2">
          <div className="text-3xl lg:text-4xl font-semibold text-green-600 dark:text-green-400 mb-1 tabular-nums">
            ${(raisedCents / 100).toLocaleString()}
          </div>
          <div className="text-base lg:text-xl text-gray-600 dark:text-gray-300">
            of ${(goalCents / 100).toLocaleString()} goal
          </div>
        </div>
        <div className="text-right col-span-1">
          <div className="text-3xl lg:text-4xl font-semibold text-green-600 dark:text-green-400 mb-1 tabular-nums">
            {backers}
          </div>
          <div className="text-base lg:text-xl text-gray-600 dark:text-gray-300">backers</div>
        </div>
      </div>

      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
        {hitPrimary && stretch ? stretch.contributeTitle : contributeTitle}
      </h3>

      <div className="space-y-3 mb-3">
        {paymentOptions.map(({ amount, label }) => {
          const count = tierCounts ? tierCounts[String(amount)] || 0 : 0;
          return (
            <button
              key={amount}
              onClick={() => handlePayment(amount)}
              disabled={isLoading}
              className={`relative w-full flex flex-col items-start gap-1 p-2 rounded-lg border-2 transition-colors text-left ${
                selectedAmount === amount
                  ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                  : "border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-green-300 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <span className="text-2xl lg:text-3xl font-semibold text-gray-900 dark:text-white tabular-nums">
                    ${(amount / 100).toFixed(0)}
                  </span>
                  <span className="text-sm lg:text-lg text-gray-600 dark:text-gray-300 leading-snug">
                    {isLoading && selectedAmount === amount ? "Processing..." : label}
                  </span>
                </div>
                <span className="inline-flex justify-center items-center w-6 h-6 rounded-full bg-green-600 text-white text-xs lg:text-sm font-semibold shadow-sm ring-2 ring-white/60 dark:ring-gray-800/60 tabular-nums flex-shrink-0">
                  {count}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <div className="flex gap-3 items-stretch">
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-2 top-1/2 text-2xl lg:text-3xl font-semibold transform -translate-y-1/2 text-gray-900 dark:text-white">
                $
              </span>
              <input
                type="number"
                placeholder="15"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                min="10"
                step="5"
                disabled={isLoading}
                className="text-2xl lg:text-3xl font-semibold w-full pl-5 lg:pl-6 pr-10 py-2 border-2 border-gray-200 dark:border-gray-600 rounded-lg focus:border-green-500 dark:focus:border-green-400 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 disabled:opacity-50 tabular-nums"
              />
              {tierCounts && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex justify-center items-center w-6 h-6 rounded-full bg-green-600 text-white text-xs lg:text-sm font-semibold shadow-sm ring-2 ring-white/60 dark:ring-gray-800/60 tabular-nums">
                  {tierCounts.custom || 0}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={handleCustomAmount}
            disabled={isLoading || !customAmount}
            className="relative px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <span>{isLoading && selectedAmount === null ? "Processing..." : "Contribute"}</span>
          </button>
        </div>
        <div className="flex items-start justify-between">
          <p className="w-1/2 text-xs text-gray-900 dark:text-white">Name your price</p>
          <p className="w-1/2 text-xs text-gray-600 dark:text-gray-400 text-right">
            Your contribution helps with processing fees
          </p>
        </div>
      </div>

      <div className="pt-6 mt-6">
        {hitPrimary && (
          <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
              &quot;What&apos;s next after Boise?&quot;
            </h3>
            <VideoPlayButtonWithContext
              thumbnailSrc="/boise-stretch-cover-2.jpg"
              videoSrc="/boise-stretch-45sec.mp4"
              videoId="boise-stretch"
              alt="Next single preview"
              className="mb-3 aspect-video"
              // instagramUrl="https://www.instagram.com/peytspencer/reel/DPg61j5EWb8" TODO: add new link here
            />
            <p className="text-base lg:text-xl text-gray-600 dark:text-gray-300">
              Thank you for your generosity! Since we reached our initial goal within just one week,
              let&apos;s stretch the goal to $1,500. I invite your support to bring my next single
              to life.
            </p>
          </div>
        )}

        <div className="flex items-center justify-center">
          <div className="flex items-center gap-4">
            <a
              href="https://instagram.com/peytspencer"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </a>
            <a
              href="https://tiktok.com/@peytspencer"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="TikTok"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-.88-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
              </svg>
            </a>
            <a
              href="https://youtube.com/@peytspencer"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="YouTube"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </a>
            <a
              href="https://x.com/peytspencer"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              aria-label="X (Twitter)"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
