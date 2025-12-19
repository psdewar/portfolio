"use client";
import { VideoPlayButtonWithContext } from "app/components/VideoPlayButtonWithContext";
import { stripePromise } from "app/lib/stripe";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TRACKLIST, BookIcon } from "./shared";

// Stripe processing fee calculation (2.9% + $0.30)
const calculateStripeFee = (baseAmount: number) => {
  const totalWithFees = Math.ceil(((baseAmount + 0.3) / 0.971) * 100) / 100;
  return { total: totalWithFees };
};

const PRICING = {
  "download-bundle-2025": 10,
  "then-and-now-bundle-2025": 30,
};

const SHIPPING = 7; // $7 flat rate shipping for physical items

// Fallback inventory (used while loading from Supabase)
const FALLBACK_INVENTORY: Record<string, number> = {
  "white-small": 11,
  "white-medium": 12,
  "white-large": 7,
  "black-small": 6,
  "black-medium": 11,
  "black-large": 2,
};

// Bundle pricing
// Pickup: fee on base price only ($30 → $31.21)
// Delivery: fee on base + shipping ($37 → $38.43), then subtract shipping since Stripe adds it
const BUNDLE_PICKUP_FEES = calculateStripeFee(PRICING["then-and-now-bundle-2025"]);
const BUNDLE_DELIVERY_FEES = {
  total: calculateStripeFee(PRICING["then-and-now-bundle-2025"] + SHIPPING).total - SHIPPING,
};
const DOWNLOAD_FEES = calculateStripeFee(PRICING["download-bundle-2025"]);

function useInitialFromURL() {
  const [initial, setInitial] = useState<{ size: string; color: string }>({
    size: "Medium",
    color: "black",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInitial({
      size: params.get("size") ?? "Medium",
      color: params.get("color") ?? "black",
    });
  }, []);

  return initial;
}

export default function Page() {
  const init = useInitialFromURL();
  const [selectedSize, setSelectedSize] = useState(init.size);
  const [selectedColor, setSelectedColor] = useState(init.color);
  const [deliveryMode, setDeliveryMode] = useState<"pickup" | "delivery">("pickup");
  const [inventory, setInventory] = useState<Record<string, number>>(FALLBACK_INVENTORY);

  // Fetch live inventory from Supabase
  useEffect(() => {
    fetch("/api/inventory")
      .then((res) => res.json())
      .then((data) => {
        if (data && !data.error) {
          setInventory(data);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    setSelectedSize(init.size);
    setSelectedColor(init.color);
  }, [init.size, init.color]);

  const sizes = useMemo(
    () => [
      { name: "Small", value: "Small" },
      { name: "Medium", value: "Medium" },
      { name: "Large", value: "Large" },
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

  const getStock = (size: string, color: string) => {
    const sku = `${color.toLowerCase()}-${size.toLowerCase()}`;
    return inventory[sku] ?? 0;
  };
  const isInStock = (size: string, color: string) => getStock(size, color) > 0;

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

  const handleCheckout = async (productId: "download-bundle-2025" | "then-and-now-bundle-2025") => {
    const stripe = await stripePromise;
    if (!stripe) return;

    const isPickup = deliveryMode === "pickup";
    const bundleFees = isPickup ? BUNDLE_PICKUP_FEES : BUNDLE_DELIVERY_FEES;

    const productConfigs = {
      "download-bundle-2025": {
        amount: Math.round(DOWNLOAD_FEES.total * 100),
        productId: "download-bundle-2025",
        metadata: {},
        skipShipping: true,
      },
      "then-and-now-bundle-2025": {
        amount: Math.round(bundleFees.total * 100),
        productId: "then-and-now-bundle-2025",
        metadata: {
          size: sizes.find((s) => s.value === selectedSize)?.name || selectedSize,
          color: colors.find((c) => c.value === selectedColor)?.name || selectedColor,
          deliveryMode,
        },
        skipShipping: isPickup,
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
        cancelPath: "/shop",
        skipShipping: config.skipShipping,
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
        <div className="flex">
          {sizes.map((size, idx) => {
            const stock = getStock(size.value, selectedColor);
            const outOfStock = stock === 0;
            const isFirst = idx === 0;
            const isLast = idx === sizes.length - 1;
            return (
              <button
                key={`${prefix}${size.value}`}
                onClick={() => !outOfStock && handleSizeClick(size.value)}
                disabled={outOfStock}
                className={`flex-1 py-3 transition-all border-2 -ml-[2px] first:ml-0 relative ${
                  isFirst ? "rounded-l-lg" : ""
                } ${isLast ? "rounded-r-lg" : ""} ${
                  selectedSize === size.value
                    ? "border-gray-900 dark:border-green-500 z-10 " +
                      (selectedColor === "white" ? "bg-white text-gray-900" : "bg-black text-white")
                    : "border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                } ${outOfStock ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <span className="text-base font-semibold">{size.value.charAt(0)}</span>
                <span
                  className={`block text-sm font-semibold ${
                    stock <= 3
                      ? "text-red-500"
                      : stock <= 5
                      ? "text-amber-500"
                      : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {stock} left
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
          Color
        </label>
        <div className="flex">
          {colors.map((color, idx) => {
            const totalStock = sizes.reduce((sum, s) => sum + getStock(s.value, color.value), 0);
            const isFirst = idx === 0;
            const isLast = idx === colors.length - 1;
            return (
              <button
                key={`${prefix}${color.value}`}
                onClick={() => handleColorClick(color.value)}
                className={`flex-1 py-3 transition-all border-2 -ml-[2px] first:ml-0 relative ${
                  isFirst ? "rounded-l-lg" : ""
                } ${isLast ? "rounded-r-lg" : ""} ${
                  selectedColor === color.value
                    ? "border-gray-900 dark:border-green-500 z-10"
                    : "border-gray-300 dark:border-gray-600"
                } ${color.value === "white" ? "bg-white" : "bg-black"}`}
                aria-label={color.name}
              >
                <span
                  className={`block text-base font-semibold ${
                    color.value === "white" ? "text-gray-900" : "text-white"
                  }`}
                >
                  {color.name}
                </span>
                <span
                  className={`block text-sm font-semibold ${
                    totalStock <= 10
                      ? "text-red-500"
                      : totalStock <= 20
                      ? "text-amber-500"
                      : "text-green-500"
                  }`}
                >
                  {totalStock} left
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="px-4 sm:px-6 lg:px-8 py-8 sm:py-12 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Bundle Card */}
          <div className="relative">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 rounded-3xl overflow-hidden flex flex-col border-2 border-green-500/50 h-full shadow-sm shadow-green-500/10">
              <div className="p-6 sm:p-8 border-b border-gray-700">
                <button
                  onClick={() => handleCheckout("then-and-now-bundle-2025")}
                  className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-400 hover:via-red-400 hover:to-pink-400 text-white font-semibold text-xl transition-all shadow-lg shadow-red-500/25 mb-4 sm:mb-5 flex items-center justify-center gap-2"
                >
                  Buy My Shirt & Music Bundle
                </button>

                <div className="flex items-center gap-3 mb-4 sm:mb-5">
                  <span className="text-6xl sm:text-7xl font-semibold text-white">
                    ${PRICING["then-and-now-bundle-2025"]}
                  </span>
                  <span className="text-white/60 text-base lg:text-lg">
                    {deliveryMode === "pickup" ? (
                      <>+ $1.21 for processing</>
                    ) : (
                      <>+ $8.42 for shipping & processing</>
                    )}
                    <br />
                    includes My Singles & 16s (2025)
                  </span>
                </div>

                {/* Pickup/Delivery Toggle */}
                <div className="mb-4 sm:mb-5">
                  <div className="flex">
                    <button
                      onClick={() => setDeliveryMode("pickup")}
                      className={`flex-1 py-3 px-4 transition-all border-2 -ml-[2px] first:ml-0 rounded-l-lg ${
                        deliveryMode === "pickup"
                          ? "border-green-500 bg-green-500/20 text-green-400 z-10"
                          : "border-gray-600 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      <span className="block text-base font-semibold">No shipping</span>
                      <span className="block text-xs opacity-70">
                        I'll pick up my shirt at a show
                      </span>
                    </button>
                    <button
                      onClick={() => setDeliveryMode("delivery")}
                      className={`flex-1 py-3 px-4 transition-all border-2 -ml-[2px] first:ml-0 rounded-r-lg ${
                        deliveryMode === "delivery"
                          ? "border-green-500 bg-green-500/20 text-green-400 z-10"
                          : "border-gray-600 text-gray-400 hover:border-gray-500"
                      }`}
                    >
                      <span className="block text-base font-semibold">Shipping</span>
                      <span className="block text-xs opacity-70">
                        I'll provide my address for delivery
                      </span>
                    </button>
                  </div>
                </div>

                <SizeColorSelector prefix="everything-" />
              </div>

              <div className="relative aspect-[16/9]">
                <Image
                  src="/images/merch/lu-psd-merch.JPG"
                  alt="Friend wearing Exhibit PSD T-Shirt"
                  fill
                  className="object-cover object-bottom"
                />
                <div className="absolute top-5 left-6 sm:left-8">
                  <span className="bg-black/80 text-white text-sm font-medium px-3 py-1.5 rounded-lg">
                    this shirt but {selectedSize.toLowerCase()}
                  </span>
                </div>
              </div>
              <div className="py-5 px-6 sm:px-8">
                <p className="font-semibold text-gray-900 dark:text-white text-base lg:text-lg mb-1">
                  From The Archives: Exhibit PSD
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg">
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
                <span className="text-6xl sm:text-7xl font-semibold text-gray-900 dark:text-white">
                  ${PRICING["download-bundle-2025"]}
                </span>
                <span className="text-gray-900/60 dark:text-white/60 text-base lg:text-lg">
                  + $0.61 for processing
                  <br />
                </span>
              </div>
            </div>

            <div className="py-5 px-6 sm:px-8 flex-1">
              <p className="text-gray-600 dark:text-gray-400 text-base lg:text-lg pb-3">
                A "16" is the typical length of one rap verse. For me, it's 16 lines of pure fire.
                Streaming is nice, but your support helps sustain my independence. You'll receive a
                zip file with mp3s and a lyricbook containing:
              </p>

              <div className="space-y-1">
                {TRACKLIST.map((track) => (
                  <div
                    key={track.name}
                    className="py-2.5 pl-4 pr-3 border-l-2 border-green-500/60 hover:border-green-500 hover:bg-green-500/5 transition-all flex items-center justify-between"
                  >
                    <span className="text-gray-900 dark:text-white font-medium text-base lg:text-lg">
                      {track.name}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-base lg:text-lg font-mono">
                      {track.duration}
                    </span>
                  </div>
                ))}
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
              videoSrc="/videos/exhibit-psd-live.mp4"
              alt="Exhibit PSD live performance"
              className="w-full h-full"
              thumbnailSrc="/images/covers/exhibit-psd-live-cover.jpg"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 pointer-events-none">
              <h3 className="text-white font-semibold">Live with the band</h3>
              <p className="text-white/80 text-sm">Gainesville, FL · 2015</p>
            </div>
          </div>

          <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
            <Image
              src="/images/merch/lu-psd-merch.JPG"
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
              src="/images/merch/exhibit-psd-merch.JPG"
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
