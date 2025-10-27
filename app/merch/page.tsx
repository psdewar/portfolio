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

  // 2) Use local state for instant updates
  const [selectedSize, setSelectedSize] = useState(init.size);
  const [selectedColor, setSelectedColor] = useState(init.color);
  const [showDescription, setShowDescription] = useState(false);

  // 3) Sync local state with URL initial values
  useEffect(() => {
    setSelectedSize(init.size);
    setSelectedColor(init.color);
  }, [init.size, init.color]);

  // Memoized arrays to prevent recreation
  const sizes = useMemo(() => ["S", "M", "L"], []);
  const colors = useMemo(
    () => [
      { name: "Black", value: "black" },
      { name: "White", value: "white" },
    ],
    []
  );

  // 4) Mirror to URL without triggering navigation
  const mirrorURL = useCallback((updates: { size?: string; color?: string }) => {
    const url = new URL(window.location.href);
    if (updates.size) url.searchParams.set("size", updates.size);
    if (updates.color) url.searchParams.set("color", updates.color);
    // Use replaceState to avoid route transitions
    window.history.replaceState({}, "", url.toString());
  }, []);

  // 5) Handlers that update local state + URL
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
  return (
    <VideoProvider>
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Hero Section with Title */}
        <div className="flex flex-col items-start gap-3">
          <div className="flex-1">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2">
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
            {/* Combined Product Card - Buy Section + Shirt Photo (swapped order) */}
            <div className="relative rounded-2xl overflow-hidden">
              <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm transition-colors h-full flex flex-col">
                {/* Buy Section - Top section (now first) */}
                <div className="p-4 sm:p-5 lg:p-6 flex flex-col gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Price
                    </label>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tabular-nums">
                        $25
                      </span>
                      <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        + shipping
                      </span>
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
                            size: selectedSize,
                            color: selectedColor,
                          },
                        }),
                      });

                      const { sessionId } = await response.json();
                      await stripe.redirectToCheckout({ sessionId });
                    }}
                    className="w-full py-3 sm:py-3.5 px-4 rounded-lg bg-green-600 hover:bg-green-700 text-white text-base sm:text-lg font-semibold transition-colors shadow-lg shadow-green-600/30"
                  >
                    Buy Now
                  </button>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Size
                    </label>
                    <div className="flex gap-2">
                      {sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => handleSizeClick(size)}
                          className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-all font-semibold text-sm sm:text-base ${
                            selectedSize === size
                              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg"
                              : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Color
                    </label>
                    <div className="flex gap-2">
                      {colors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => handleColorClick(color.value)}
                          className={`flex-1 py-2 sm:py-2.5 px-3 sm:px-4 rounded-lg transition-all font-semibold text-sm sm:text-base ${
                            selectedColor === color.value
                              ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-lg"
                              : "bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600"
                          }`}
                        >
                          {color.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Shirt Photo with Info Icon - Bottom section (now second) */}
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
                      This was my debut design from when I performed as PSD, the initials that
                      include my last name. Made with 100% cotton for lasting comfort,
                      breathability, and a gentle feel on sensitive skin.
                    </p>
                  </div>
                </div>
              </div>
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
                  Rocking a white tee with my live band
                </h3>
                <p className="text-white/90 text-xs lg:text-sm">
                  High Dive · Gainesville, FL · Fall 2015
                </p>
              </div>
            </div>
          </div>

          {/* Explanation Card - Mobile Only, between product and model photo */}
          <div className="lg:hidden bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              This was my debut design from when I performed as PSD, the initials that include my
              last name. Made with 100% cotton for lasting comfort, breathability, and a gentle feel
              on sensitive skin.
            </p>
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
          </div>
        </div>
      </div>
    </VideoProvider>
  );
}
