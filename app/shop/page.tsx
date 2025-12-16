"use client";
import { VideoPlayButtonWithContext } from "app/components/VideoPlayButtonWithContext";
import { stripePromise } from "app/lib/stripe";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

const COMING_SOON = true; // Delete this line to enable the shop

// Stripe processing fee calculation (2.9% + $0.30)
const calculateStripeFee = (baseAmount: number) => {
  const totalWithFees = Math.ceil(((baseAmount + 0.3) / 0.971) * 100) / 100;
  return { total: totalWithFees };
};

const PRICING = {
  "tee-exhibit-psd": 25,
  "download-bundle-2025": 10,
  "then-and-now-bundle-2025": 30,
};

const SHIPPING = 5; // $5 flat rate shipping for physical items

// For physical items: calculate fee on (item + shipping), then subtract shipping
// This way Stripe processes (item_with_fee + shipping) and we net the full base amounts
const TSHIRT_TOTAL_WITH_FEES = calculateStripeFee(PRICING["tee-exhibit-psd"] + SHIPPING);
const TSHIRT_FEES = { total: TSHIRT_TOTAL_WITH_FEES.total - SHIPPING }; // Item price only

const DOWNLOAD_FEES = calculateStripeFee(PRICING["download-bundle-2025"]); // No shipping

const EVERYTHING_TOTAL_WITH_FEES = calculateStripeFee(
  PRICING["then-and-now-bundle-2025"] + SHIPPING
);
const EVERYTHING_FEES = { total: EVERYTHING_TOTAL_WITH_FEES.total - SHIPPING }; // Item price only

const TRACKLIST = [
  { name: "Right One", duration: "2:15" },
  { name: "Safe", duration: "2:17" },
  { name: "Patience", duration: "2:21" },
  { name: "Pretty Girls Freestyle", duration: "0:48" },
  { name: "Chains & Whips Freestyle", duration: "0:56" },
  { name: "Mula Freestyle", duration: "1:01" },
];

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

  useEffect(() => {
    setSelectedSize(init.size);
    setSelectedColor(init.color);
  }, [init.size, init.color]);

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

  const mirrorURL = useCallback((updates: { size?: string; color?: string }) => {
    const url = new URL(window.location.href);
    if (updates.size) url.searchParams.set("size", updates.size);
    if (updates.color) url.searchParams.set("color", updates.color);
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

  const handleCheckout = async (
    productId: "tee-exhibit-psd" | "download-bundle-2025" | "then-and-now-bundle-2025"
  ) => {
    const stripe = await stripePromise;
    if (!stripe) return;

    const productConfigs = {
      "tee-exhibit-psd": {
        amount: Math.round(TSHIRT_FEES.total * 100),
        productId: "tee-exhibit-psd",
        metadata: {
          size: sizes.find((s) => s.value === selectedSize)?.name || selectedSize,
          color: colors.find((c) => c.value === selectedColor)?.name || selectedColor,
        },
      },
      "download-bundle-2025": {
        amount: Math.round(DOWNLOAD_FEES.total * 100),
        productId: "download-bundle-2025",
        metadata: {},
      },
      "then-and-now-bundle-2025": {
        amount: Math.round(EVERYTHING_FEES.total * 100),
        productId: "then-and-now-bundle-2025",
        metadata: {
          size: sizes.find((s) => s.value === selectedSize)?.name || selectedSize,
          color: colors.find((c) => c.value === selectedColor)?.name || selectedColor,
        },
      },
    };

    const config = productConfigs[productId];
    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: config.amount,
        productId: config.productId,
        metadata: config.metadata,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.sessionId) {
      console.error("Checkout error:", data);
      alert(data.error || "Checkout failed");
      return;
    }
    await stripe.redirectToCheckout({ sessionId: data.sessionId });
  };

  const SizeColorSelector = ({ prefix = "" }: { prefix?: string }) => (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Size
        </label>
        <div className="flex gap-1.5">
          {sizes.map((size) => (
            <button
              key={`${prefix}${size.value}`}
              onClick={() => handleSizeClick(size.value)}
              className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all border ${
                selectedSize === size.value
                  ? selectedColor === "white"
                    ? "bg-white text-gray-900 border-gray-300"
                    : "bg-black text-white border-black"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-transparent"
              }`}
            >
              {size.value}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Color
        </label>
        <div className="flex gap-1.5">
          {colors.map((color) => (
            <button
              key={`${prefix}${color.value}`}
              onClick={() => handleColorClick(color.value)}
              className={`flex-1 h-9 rounded-lg transition-all border-2 ${
                selectedColor === color.value
                  ? "border-gray-900 dark:border-green-500 ring-2 ring-gray-900/20 dark:ring-green-500/20"
                  : "border-gray-300 dark:border-gray-600"
              }`}
              style={{ backgroundColor: color.value }}
              aria-label={color.name}
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (COMING_SOON) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="font-bebas text-[12vw] sm:text-[8vw] leading-none text-neutral-200 dark:text-neutral-800 mb-2">
            Coming Soon
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mb-8">
            The shop is under construction. Check back soon for merch and music.
          </p>
          <Link
            href="/music"
            className="inline-block px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded-lg font-medium hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors"
          >
            Listen to music
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <div className="relative md:col-span-2 lg:col-span-1">
            <div className="absolute -top-1 -right-1 z-20 overflow-hidden w-32 h-32 pointer-events-none">
              <div
                className={`absolute top-7 -right-9 w-40 text-center transform rotate-45 text-sm font-semibold py-1.5 shadow-md ${
                  selectedColor === "white" ? "bg-white text-gray-900" : "bg-black text-white"
                }`}
              >
                SAVE $5
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-3xl overflow-hidden flex flex-col border-2 border-green-500/50 h-full shadow-sm shadow-green-500/10">
              <div className="p-6 sm:p-8 border-b border-gray-700">
                <button
                  onClick={() => handleCheckout("then-and-now-bundle-2025")}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-500 to-pink-500 hover:from-violet-500 hover:via-fuchsia-400 hover:to-pink-400 text-white font-semibold text-xl transition-all shadow-lg shadow-fuchsia-500/25 mb-4 sm:mb-5"
                >
                  Buy My Then & Now Bundle
                </button>

                <div className="flex items-center gap-3 mb-4 sm:mb-5">
                  <span className="text-4xl sm:text-5xl font-semibold text-white">
                    ${PRICING["then-and-now-bundle-2025"]}
                  </span>
                  <span className="text-white/60 text-sm">
                    + shipping & processing fees
                    <br />
                    so I receive the full amount
                  </span>
                </div>

                <SizeColorSelector prefix="everything-" />
              </div>

              <div className="p-6 sm:p-8 flex-1">
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-white text-lg">
                    <span className="text-green-400 text-xl">✓</span>
                    <span>Exhibit PSD T-Shirt</span>
                  </li>
                  <li className="flex items-center gap-3 text-white text-lg">
                    <span className="text-green-400 text-xl">✓</span>
                    <span>All 6 track downloads + lyrics</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleCheckout("tee-exhibit-psd")}
                className={`w-full py-4 px-6 rounded-xl font-semibold text-xl transition-colors mb-4 sm:mb-5 ${
                  selectedColor === "white"
                    ? "bg-white hover:bg-gray-100 text-gray-900"
                    : "bg-black hover:bg-gray-900 text-white"
                }`}
              >
                Buy T-Shirt
              </button>

              <div className="flex items-center gap-3 mb-4 sm:mb-5">
                <span className="text-4xl sm:text-5xl font-semibold text-gray-900 dark:text-white">
                  ${PRICING["tee-exhibit-psd"]}
                </span>
                <span className="text-gray-900/60 dark:text-white/60 text-sm">
                  + shipping & processing fees
                  <br />
                  so I receive the full amount
                </span>
              </div>

              <SizeColorSelector prefix="tshirt-" />
            </div>

            <div className="flex-1 flex flex-col">
              <div className="relative aspect-[16/9]">
                <Image
                  src="/images/lu-psd-merch.JPG"
                  alt="Friend wearing Exhibit PSD T-Shirt"
                  fill
                  className="object-cover object-bottom"
                />
                <div className="absolute top-5 left-6 sm:left-8">
                  <span className="bg-black/80 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
                    this shirt but {sizes.find((s) => s.value === selectedSize)?.name.toLowerCase()}
                  </span>
                </div>
              </div>
              <div className="p-5 sm:p-6 pb-3">
                <p className="font-semibold text-gray-900 dark:text-white text-base mb-1">
                  From The Archives: Exhibit PSD
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-base">
                  My first design, a decade in the making. The "PSD" logo from my original rap
                  moniker, first sketched in college at UF. 100% cotton, made to last.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden flex flex-col border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="p-6 sm:p-8 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => handleCheckout("download-bundle-2025")}
                className="w-full py-4 px-6 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold text-xl transition-colors mb-4 sm:mb-5"
              >
                Buy My Singles & 16s (2025)
              </button>

              <div className="flex items-center gap-3">
                <span className="text-4xl sm:text-5xl font-semibold text-gray-900 dark:text-white">
                  ${PRICING["download-bundle-2025"]}
                </span>
                <span className="text-gray-900/60 dark:text-white/60 text-sm">
                  + processing fees
                  <br />
                  so I receive the full amount
                </span>
              </div>
            </div>

            <div className="p-6 sm:p-8 flex-1">
              <p className="text-gray-600 dark:text-gray-400 text-base mb-5">
                A "16" is the typical length of one rap verse. For me, it's 16 lines of pure fire.
                Streaming is nice, but your support helps sustain my independence. You'll receive a
                zip file containing:
              </p>

              <div className="space-y-1">
                {TRACKLIST.map((track) => (
                  <div
                    key={track.name}
                    className="py-2.5 pl-4 pr-3 border-l-2 border-green-500/60 hover:border-green-500 hover:bg-green-500/5 transition-all flex items-center justify-between"
                  >
                    <span className="text-gray-900 dark:text-white font-medium text-lg">
                      {track.name}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm font-mono">
                      {track.duration}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex items-center gap-2 text-green-600 dark:text-green-400">
                <span className="text-xl">✓</span>
                <span className="text-base font-medium">Lyrics included (PDF)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mt-12 sm:mt-16">
        <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white mb-6">
          A Decade In The Making
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
          <div className="relative rounded-2xl overflow-hidden aspect-[9/16] md:aspect-auto md:row-span-2">
            <VideoPlayButtonWithContext
              videoId="exhibit-psd-live"
              videoSrc="/exhibit-psd-live.mp4"
              alt="Exhibit PSD live performance"
              className="w-full h-full"
              thumbnailSrc="/images/exhibit-psd-live-cover.jpg"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-none">
              <h3 className="text-white font-semibold">Live with the band</h3>
              <p className="text-white/80 text-sm">Gainesville, FL · 2015</p>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <Image
              src="/images/lu-psd-merch.JPG"
              alt="Friend wearing Exhibit PSD"
              fill
              className="object-cover object-bottom"
              priority
            />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-black/50 via-black/25 to-transparent p-4 flex flex-col justify-start pointer-events-none">
              <h3 className="text-white font-semibold">With the homie Ludger</h3>
              <p className="text-white/80 text-sm">Los Angeles, CA · 2018</p>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <Image
              src="/images/exhibit-psd-merch.JPG"
              alt="Exhibit PSD T-Shirt"
              fill
              className="object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-black/50 via-black/25 to-transparent p-4 flex flex-col justify-end pointer-events-none">
              <h3 className="text-white font-semibold">Work In Progress</h3>
              <p className="text-white/80 text-sm">My 3rd mixtape you can find on SoundCloud!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-12 sm:h-16" />
    </div>
  );
}
