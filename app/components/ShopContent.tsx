"use client";
import { VideoPlayButtonWithContext } from "app/components/VideoPlayButtonWithContext";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TRACKLIST } from "../shop/shared";
import { calculateStripeFee } from "../lib/stripe";

const PRICING = {
  "singles-16s-pack-2025": 10,
  "then-and-now-bundle-2025": 30,
};

const SHIPPING = 7;

const FALLBACK_INVENTORY: Record<string, number> = {
  "white-small": 11,
  "white-medium": 12,
  "white-large": 7,
  "black-small": 6,
  "black-medium": 11,
  "black-large": 2,
};

const BUNDLE_PICKUP_FEES = calculateStripeFee(
  PRICING["then-and-now-bundle-2025"],
);
const BUNDLE_DELIVERY_FEES = {
  total:
    calculateStripeFee(PRICING["then-and-now-bundle-2025"] + SHIPPING).total -
    SHIPPING,
};
const DOWNLOAD_FEES = calculateStripeFee(PRICING["singles-16s-pack-2025"]);

const InfoIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

interface ShopContentProps {
  showGallery?: boolean;
  cancelPath?: string;
}

export function ShopContent({ showGallery = true, cancelPath = "/shop" }: ShopContentProps) {
  const [selectedSize, setSelectedSize] = useState("Medium");
  const [selectedColor, setSelectedColor] = useState("black");
  const [deliveryMode, setDeliveryMode] = useState<"pickup" | "delivery">("pickup");
  const [inventory, setInventory] = useState<Record<string, number>>(FALLBACK_INVENTORY);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const size = params.get("size");
    const color = params.get("color");
    if (size) setSelectedSize(size);
    if (color) setSelectedColor(color);
  }, []);

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

  const sizes = useMemo(
    () => [
      { name: "Small", value: "Small" },
      { name: "Medium", value: "Medium" },
      { name: "Large", value: "Large" },
    ],
    [],
  );

  const colors = useMemo(
    () => [
      { name: "Black", value: "black" },
      { name: "White", value: "white" },
    ],
    [],
  );

  const getStock = (size: string, color: string) => {
    const sku = `${color.toLowerCase()}-${size.toLowerCase()}`;
    return inventory[sku] ?? 0;
  };
  const isSoldOut = (size: string, color: string) =>
    getStock(size, color) === 0;

  const handleCheckout = async (
    productId: "singles-16s-pack-2025" | "then-and-now-bundle-2025",
  ) => {
    const isPickup = deliveryMode === "pickup";
    const bundleFees = isPickup ? BUNDLE_PICKUP_FEES : BUNDLE_DELIVERY_FEES;

    const productConfigs = {
      "singles-16s-pack-2025": {
        amount: Math.round(DOWNLOAD_FEES.total * 100),
        productId: "singles-16s-pack-2025",
        metadata: {},
        skipShipping: true,
      },
      "then-and-now-bundle-2025": {
        amount: Math.round(bundleFees.total * 100),
        productId: "then-and-now-bundle-2025",
        metadata: {
          size:
            sizes.find((s) => s.value === selectedSize)?.name || selectedSize,
          color:
            colors.find((c) => c.value === selectedColor)?.name ||
            selectedColor,
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
        cancelPath,
        skipShipping: config.skipShipping,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.url) {
      console.error("Checkout error:", data);
      alert(data.error || "Checkout failed");
      return;
    }
    window.location.href = data.url;
  };

  const [checkingOutOption, setCheckingOutOption] = useState<string | null>(null);

  const SizeColorSelector = ({ prefix = "" }: { prefix?: string }) => {
    const options = [
      { size: "Small", color: "black", label: "Black + Small" },
      { size: "Medium", color: "black", label: "Black + Medium" },
      { size: "Large", color: "black", label: "Black + Large" },
      { size: "Small", color: "white", label: "White + Small" },
      { size: "Medium", color: "white", label: "White + Medium" },
      { size: "Large", color: "white", label: "White + Large" },
    ];

    const handleOptionCheckout = async (size: string, color: string) => {
      const optionKey = `${color}-${size}`;
      setCheckingOutOption(optionKey);
      const isPickup = deliveryMode === "pickup";
      const bundleFees = isPickup ? BUNDLE_PICKUP_FEES : BUNDLE_DELIVERY_FEES;

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Math.round(bundleFees.total * 100),
          productId: "then-and-now-bundle-2025",
          metadata: { size, color, deliveryMode },
          cancelPath,
          skipShipping: isPickup,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.url) {
        console.error("Checkout error:", data);
        alert(data.error || "Checkout failed");
        return;
      }
      window.location.href = data.url;
    };

    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 w-full">
        {options.map((opt) => {
          const soldOut = isSoldOut(opt.size, opt.color);
          const isSelected =
            selectedSize === opt.size && selectedColor === opt.color;
          const optionKey = `${opt.color}-${opt.size}`;
          const isCheckingOut = checkingOutOption === optionKey;
          const anyCheckingOut = checkingOutOption !== null;
          return (
            <button
              key={`${prefix}${opt.color}-${opt.size}`}
              onClick={() => {
                if (!soldOut && !anyCheckingOut) {
                  setSelectedSize(opt.size);
                  setSelectedColor(opt.color);
                  handleOptionCheckout(opt.size, opt.color);
                }
              }}
              disabled={soldOut || anyCheckingOut}
              className={`py-4 px-4 transition-all relative flex items-center gap-3 ${
                isCheckingOut
                  ? "bg-white/20 text-white"
                  : isSelected
                    ? "bg-white/10 text-white"
                    : "bg-black/10 text-white/80 hover:bg-white/20"
              } ${soldOut || (anyCheckingOut && !isCheckingOut) ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <span
                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                  isSelected || isCheckingOut ? "border-white" : "border-white/50"
                }`}
              >
                {isCheckingOut ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : isSelected ? (
                  <span className="w-2 h-2 rounded-full bg-white" />
                ) : null}
              </span>
              <span className="text-sm sm:text-base font-medium">
                {isCheckingOut ? "Checking out..." : opt.label}
              </span>
              {soldOut && !isCheckingOut && (
                <span className="text-[10px] sm:text-xs text-red-300 font-medium ml-auto">
                  Sold Out
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:min-h-screen">
        <div className="flex flex-col bg-[#A31628]">
          <div className="flex flex-col p-6 sm:p-8 gap-4 sm:gap-5">
            <h2 className="text-white font-semibold text-2xl sm:text-3xl">
              Buy Then & Now Bundle
              <p className="font-normal text-white/80 text-base lg:text-lg">
                Includes one Exhibit PSD shirt and Singles & 16s Pack (2025)
              </p>
            </h2>
            <label className="text-white/90 text-lg sm:text-xl font-medium">1. Select delivery</label>
            <div className="grid grid-cols-2 w-full">
              <button
                onClick={() => setDeliveryMode("pickup")}
                className={`py-5 px-5 transition-all rounded-l-full ${
                  deliveryMode === "pickup"
                    ? "text-white z-10 bg-white/10"
                    : "bg-black/10 text-white/80 hover:bg-white/20"
                }`}
              >
                <span className="block text-lg sm:text-xl font-semibold">Pick Up</span>
                <span className="block text-base sm:text-lg opacity-80">
                  At a show for free
                </span>
              </button>
              <button
                onClick={() => setDeliveryMode("delivery")}
                className={`py-5 px-5 transition-all rounded-r-full ${
                  deliveryMode === "delivery"
                    ? "text-white z-10 bg-white/10"
                    : "bg-black/10 text-white/80 hover:bg-white/20"
                }`}
              >
                <span className="block text-lg sm:text-xl font-semibold">
                  Ship To Me
                </span>
                <span className="block text-base sm:text-lg opacity-80">$7 shipping</span>
              </button>
            </div>
          </div>
          <label className="text-white/90 text-lg sm:text-xl font-medium px-6 sm:px-8 pb-4 sm:pb-5">
            2. Select color & size to purchase
          </label>
          <SizeColorSelector prefix="everything-" />
          <div className="relative aspect-[16/9] overflow-hidden">
            <Image
              src="/images/merch/lu-psd-merch.JPG"
              alt="Friend wearing Exhibit PSD T-Shirt"
              fill
              className="object-cover object-bottom"
            />
            <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-black/75 via-black/50 to-transparent px-6 sm:px-8 flex flex-col justify-start pointer-events-none">
              <div className="flex items-center gap-3 mt-4 sm:mt-5">
                <span className="text-white text-6xl sm:text-7xl font-semibold">
                  ${PRICING["then-and-now-bundle-2025"]}
                </span>
                <span className="text-white/60 text-base lg:text-lg">
                  {deliveryMode === "pickup" ? (
                    <>+ $1.21 for processing</>
                  ) : (
                    <>+ $8.42 for shipping & processing</>
                  )}
                  <br />
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-all z-10"
              aria-label="Show info"
            >
              <InfoIcon className="w-5 h-5 text-white" />
            </button>
            <div
              className={`absolute top-0 right-0 h-full w-1/2 bg-black/80 backdrop-blur-sm transform transition-transform duration-300 ease-out ${
                showInfo ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="p-4 sm:p-6 h-full flex flex-col justify-center">
                <h3 className="font-semibold text-white text-lg lg:text-xl mb-2">
                  From The Archives: Exhibit PSD
                </h3>
                <p className="text-white/90 text-sm lg:text-base">
                  My first design, a decade in the making. The "PSD" logo from
                  my original rap moniker, first sketched in college at UF. 100%
                  cotton, made to last.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Download Card - Full Width Color Block - Entirely Clickable */}
        <button
          onClick={() => handleCheckout("singles-16s-pack-2025")}
          className="bg-[#1628A3] hover:bg-blue-700 flex flex-col text-left transition-colors cursor-pointer"
        >
          <div className="flex flex-col p-6 sm:p-8 gap-4 sm:gap-5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-white font-semibold text-2xl sm:text-3xl">
                Buy Singles & 16s Pack (2025)
              </h2>
              <div className="bg-white/20 rounded-full px-3 py-1 shrink-0">
                <span className="text-white/90 text-sm font-medium">
                  Tap anywhere to purchase
                </span>
              </div>
            </div>
            <p className="text-white/80 text-base lg:text-lg">
              A "16" is the number of bars, the typical length of one rap verse.
              I write every bar myself, and grabbing this pack supports my
              independence the same as streaming "Patience" 3,000 times! You'll
              receive a zip file with mp3s and a lyricbook containing:
            </p>
            <div className="space-y-1">
              {TRACKLIST.map((track) => (
                <div
                  key={track.name}
                  className="py-3 pl-4 pr-3 border-l-2 border-white/40 hover:border-white transition-all flex items-center justify-between"
                >
                  <span className="font-bebas text-white text-3xl lg:text-4xl">
                    {track.name}
                  </span>
                  <span className="font-mono text-white/70 text-xl lg:text-2xl ">
                    {track.duration}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-6xl sm:text-7xl font-semibold text-white">
                ${PRICING["singles-16s-pack-2025"]}
              </span>
              <span className="text-white/70 text-base lg:text-lg">
                + $0.61 for processing
                <br />
              </span>
            </div>
          </div>
        </button>
      </div>

      {showGallery && (
        <>
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
                  <h3 className="text-white font-semibold">
                    With the homie Ludger
                  </h3>
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
                  <p className="text-white/80 text-sm">
                    My 3rd mixtape you can find on SoundCloud!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="h-12 sm:h-16" />
        </>
      )}
    </div>
  );
}
