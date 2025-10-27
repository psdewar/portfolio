"use client";
import { VideoPlayButtonWithContext } from "app/components/VideoPlayButtonWithContext";
import { VideoProvider } from "app/contexts/VideoContext";
import { stripePromise } from "app/lib/stripe";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";

function useInitialFromURL() {
  const [initial, setInitial] = useState<{ size: string; color: string }>({
    size: "M",
    color: "black",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInitial({
      size: params.get("size") ?? "M",
      color: params.get("color") ?? "black",
    });
  }, []);

  return initial;
}

export default function Page() {
  const init = useInitialFromURL();

  const [selectedSize, setSelectedSize] = useState(init.size);
  const [selectedColor, setSelectedColor] = useState(init.color);
  const [showDescription, setShowDescription] = useState(false);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    setSelectedSize(init.size);
    setSelectedColor(init.color);
  }, [init.size, init.color]);

  useEffect(() => {
    const handleScroll = () => {
      const buySection = document.getElementById("buy-section-original");
      if (buySection) {
        const rect = buySection.getBoundingClientRect();
        // If the original section is scrolled past the top of viewport, show sticky
        setIsSticky(rect.bottom < 0);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const sizes = useMemo(
    () => [
      { name: "Small", value: "S" },
      { name: "Medium", value: "M" },
      { name: "Large", value: "L" },
    ],
    []
  );
  const colors = useMemo(
    () => [
      { name: "Black", value: "black" },
      { name: "White", value: "white" },
    ],
    []
  );

  // Mirror to URL without triggering navigation
  const mirrorURL = useCallback((updates: { size?: string; color?: string }) => {
    const url = new URL(window.location.href);
    if (updates.size) url.searchParams.set("size", updates.size);
    if (updates.color) url.searchParams.set("color", updates.color);
    // Use replaceState to avoid route transitions
    window.history.replaceState({}, "", url.toString());
  }, []);

  const handleSizeClick = useCallback(
    (size: string) => {
      setSelectedSize(size);
      mirrorURL({ size, color: selectedColor });
    },
    [selectedColor, mirrorURL]
  );

  const handleColorClick = useCallback(
    (color: string) => {
      setSelectedColor(color);
      mirrorURL({ color, size: selectedSize });
    },
    [selectedSize, mirrorURL]
  );

  const BuySectionContent = () => (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-3xl sm:text-4xl font-semibold text-gray-900 dark:text-white tabular-nums">
              $25
            </span>
            <div className="flex flex-col text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-tight">
              <span>+ shipping</span>
              <span>within U.S.</span>
            </div>
          </div>
          <button
            onClick={async () => {
              const stripe = await stripePromise;
              if (!stripe) return;

              const response = await fetch("/api/create-checkout-session", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  amount: 2500,
                  productId: "prod_TEhR1023gBd6fk",
                  mode: "payment",
                  currency: "usd",
                  metadata: {
                    size: sizes.find((s) => s.value === selectedSize)?.name || selectedSize,
                    color: colors.find((c) => c.value === selectedColor)?.name || selectedColor,
                  },
                }),
              });

              const { sessionId } = await response.json();
              await stripe.redirectToCheckout({ sessionId });
            }}
            className="flex-1 py-2 sm:py-2.5 px-4 sm:px-6 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm sm:text-base font-semibold transition-colors shadow-lg shadow-green-600/30 whitespace-nowrap"
          >
            Buy Now
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Size · {sizes.find((s) => s.value === selectedSize)?.name}
          </label>
          <div className="flex gap-2">
            {sizes.map((size) => (
              <button
                key={size.value}
                onClick={() => handleSizeClick(size.value)}
                className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-all font-semibold text-sm sm:text-base ${
                  selectedSize === size.value
                    ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg"
                    : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                }`}
              >
                {size.value}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Color · {colors.find((c) => c.value === selectedColor)?.name}
          </label>
          <div className="flex gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                onClick={() => handleColorClick(color.value)}
                className={`flex-1 h-10 sm:h-11 rounded-lg transition-all border-2 ${
                  selectedColor === color.value
                    ? "border-gray-900 dark:border-green-600 shadow-lg scale-105"
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                }`}
                style={{ backgroundColor: color.value }}
                aria-label={color.name}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <VideoProvider>
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
        {/* Hero Section with Title */}
        <div className="flex flex-col items-start gap-3">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-gray-900 dark:text-white mb-2">
              From The Archives: Exhibit PSD
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600 dark:text-gray-400">
              My first t-shirt, a decade in the making
            </p>
          </div>
        </div>

        {/* Main Grid - All screens: vertical stack on mobile/tablet, 2 columns on desktop */}
        <div className="space-y-3 sm:space-y-4">
          {/* Row 1: Product Card (Shirt + Buy) and Video side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
            {/* Combined Product Card - Buy Section + Shirt Photo */}
            <div className="relative rounded-2xl overflow-hidden">
              <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm transition-colors h-full flex flex-col">
                {/* Buy Section - Original position at top */}
                <div
                  id="buy-section-original"
                  className="border-b border-gray-200 dark:border-gray-700 p-4 sm:p-5 lg:p-6 flex flex-col gap-3 sm:gap-4"
                >
                  <BuySectionContent />
                </div>

                {/* Shirt Photo with Info Icon */}
                <div
                  className="relative h-64 sm:h-80 lg:h-[500px] overflow-hidden group cursor-pointer"
                  onClick={() => setShowDescription(!showDescription)}
                >
                  <Image
                    src="/images/exhibit-psd-merch.JPG"
                    alt="Lu wearing Exhibit PSD"
                    fill
                    className="object-cover"
                  />
                  {/* Info Icon - Always visible */}
                  <button
                    className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white w-8 h-8 rounded-full flex items-center justify-center group-hover:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDescription(!showDescription);
                    }}
                    aria-label="Product information"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </button>
                  {/* Description Overlay - hover on desktop, toggle on mobile */}
                  <div
                    className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 p-4 sm:p-6 flex items-center justify-center ${
                      showDescription
                        ? "opacity-100"
                        : "opacity-0 sm:group-hover:opacity-100 pointer-events-none"
                    }`}
                  >
                    <p className="text-white text-xs sm:text-sm lg:text-base leading-relaxed text-center">
                      The inaugural design from my first rap moniker, featuring my own initials.
                      Crafted in 100% cotton for enduring comfort, natural breathability, and a soft
                      touch suitable even for sensitive skin.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Explanation Card - Mobile Only, between product and model photo */}
            <div className="lg:hidden bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                The inaugural design from my first rap moniker, my own initials. Crafted in 100%
                cotton for enduring comfort, natural breathability, and a soft touch suitable even
                for sensitive skin.
              </p>
            </div>

            {/* Video - Desktop: Right side, Mobile: Below product card */}
            <div className="relative rounded-2xl overflow-hidden group aspect-[3/4] lg:aspect-auto lg:h-auto">
              <VideoPlayButtonWithContext
                videoId="exhibit-psd-live"
                videoSrc="/exhibit-psd-live.mp4"
                alt="Exhibit PSD live performance"
                className="w-full h-full"
                thumbnailSrc="/images/exhibit-psd-live-cover.jpg"
              />
              {/* Video Title Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 sm:p-4 pointer-events-none">
                <h3 className="text-white font-semibold text-sm lg:text-base">
                  Rocking my white tee with a live band
                </h3>
                <p className="text-white/90 text-xs lg:text-sm">Gainesville, FL · Fall 2015</p>
              </div>
            </div>
          </div>

          {/* Row 2: Model Photo - Always horizontal, full width underneath */}
          <div className="relative rounded-2xl overflow-hidden aspect-[16/9] sm:aspect-[21/9]">
            <Image
              src="/images/lu-psd-merch.JPG"
              alt="Exhibit PSD merchandise"
              fill
              className="object-cover object-bottom"
              priority
            />
            {/* Title Overlay - Top Left with darker gradient */}
            <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/90 via-black/80 to-transparent p-3 sm:p-4 pb-8 sm:pb-10 pointer-events-none">
              <h3 className="text-white font-semibold text-sm lg:text-base drop-shadow-lg">
                Hanging with the homie Ludger
              </h3>
              <p className="text-white text-xs lg:text-sm drop-shadow-lg">
                Los Angeles, CA · Spring 2018
              </p>
            </div>
          </div>
        </div>

        {/* Sticky Footer - Appears when original buy section scrolls out of view */}
        {isSticky && (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-700 shadow-2xl">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 lg:py-6">
              <BuySectionContent />
            </div>
          </div>
        )}
      </div>
    </VideoProvider>
  );
}
