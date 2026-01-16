"use client";
import { VideoPlayButtonWithContext } from "app/components/VideoPlayButtonWithContext";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const BUNDLE_PICKUP_FEES = calculateStripeFee(PRICING["then-and-now-bundle-2025"]);
const BUNDLE_DELIVERY_FEES = {
  total: calculateStripeFee(PRICING["then-and-now-bundle-2025"] + SHIPPING).total - SHIPPING,
};
const DOWNLOAD_FEES = calculateStripeFee(PRICING["singles-16s-pack-2025"]);

const InfoIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="12" cy="12" r="10" />
    <text x="12" y="17" textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">
      i
    </text>
  </svg>
);

interface ShopContentProps {
  showGallery?: boolean;
  cancelPath?: string;
}

export function ShopContent({ showGallery = true, cancelPath = "/shop" }: ShopContentProps) {
  const searchParams = useSearchParams();
  const [selectedSize, setSelectedSize] = useState("Medium");
  const [selectedColor, setSelectedColor] = useState("black");
  const [deliveryMode, setDeliveryMode] = useState<"pickup" | "delivery">("pickup");
  const [inventory, setInventory] = useState<Record<string, number>>(FALLBACK_INVENTORY);
  const [showInfo, setShowInfo] = useState(false);
  const [bundlePrice, setBundlePrice] = useState(PRICING["then-and-now-bundle-2025"]);
  const [musicPrice, setMusicPrice] = useState(PRICING["singles-16s-pack-2025"]);
  const [hoveringMusicIncrement, setHoveringMusicIncrement] = useState(false);
  const [bundleToast, setBundleToast] = useState<{ amount: number; fading: boolean } | null>(null);
  const [musicToast, setMusicToast] = useState<{ amount: number; fading: boolean } | null>(null);
  const bundleToastTimers = useRef<{ fade?: NodeJS.Timeout; hide?: NodeJS.Timeout }>({});
  const musicToastTimers = useRef<{ fade?: NodeJS.Timeout; hide?: NodeJS.Timeout }>({});

  // Restore state from URL params (when returning from cancelled checkout)
  useEffect(() => {
    const size = searchParams.get("size");
    const color = searchParams.get("color");
    const delivery = searchParams.get("delivery");
    const bundlePriceParam = searchParams.get("bundlePrice");
    const musicPriceParam = searchParams.get("musicPrice");

    if (size && ["Small", "Medium", "Large"].includes(size)) setSelectedSize(size);
    if (color && ["black", "white"].includes(color)) setSelectedColor(color);
    if (delivery && ["pickup", "delivery"].includes(delivery)) setDeliveryMode(delivery as "pickup" | "delivery");
    if (bundlePriceParam) {
      const parsed = parseInt(bundlePriceParam, 10);
      if (!isNaN(parsed) && parsed >= PRICING["then-and-now-bundle-2025"]) setBundlePrice(parsed);
    }
    if (musicPriceParam) {
      const parsed = parseInt(musicPriceParam, 10);
      if (!isNaN(parsed) && parsed >= PRICING["singles-16s-pack-2025"]) setMusicPrice(parsed);
    }
  }, [searchParams]);

  const showBundleToast = (increment: number) => {
    clearTimeout(bundleToastTimers.current.fade);
    clearTimeout(bundleToastTimers.current.hide);
    setBundleToast((prev) => ({ amount: (prev?.amount || 0) + increment, fading: false }));
    bundleToastTimers.current.fade = setTimeout(() => setBundleToast((prev) => prev ? { ...prev, fading: true } : null), 800);
    bundleToastTimers.current.hide = setTimeout(() => setBundleToast(null), 1300);
  };

  const showMusicToast = (increment: number) => {
    clearTimeout(musicToastTimers.current.fade);
    clearTimeout(musicToastTimers.current.hide);
    setMusicToast((prev) => ({ amount: (prev?.amount || 0) + increment, fading: false }));
    musicToastTimers.current.fade = setTimeout(() => setMusicToast((prev) => prev ? { ...prev, fading: true } : null), 800);
    musicToastTimers.current.hide = setTimeout(() => setMusicToast(null), 1300);
  };

  const bundleFees = useMemo(() => {
    const isPickup = deliveryMode === "pickup";
    const pickupFees = calculateStripeFee(bundlePrice);
    const deliveryFees = {
      total: calculateStripeFee(bundlePrice + SHIPPING).total - SHIPPING,
    };
    return isPickup ? pickupFees : deliveryFees;
  }, [bundlePrice, deliveryMode]);

  const musicFees = useMemo(() => calculateStripeFee(musicPrice), [musicPrice]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const size = params.get("size");
    const color = params.get("color");
    const delivery = params.get("delivery");
    const bPrice = params.get("bundlePrice");
    const mPrice = params.get("musicPrice");
    if (size) setSelectedSize(size);
    if (color) setSelectedColor(color);
    if (delivery === "pickup" || delivery === "delivery") setDeliveryMode(delivery);
    if (bPrice) setBundlePrice(Math.max(PRICING["then-and-now-bundle-2025"], parseInt(bPrice)));
    if (mPrice) setMusicPrice(Math.max(PRICING["singles-16s-pack-2025"], parseInt(mPrice)));
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
    []
  );

  const colors = useMemo(
    () => [
      { name: "Black", value: "black" },
      { name: "White", value: "white" },
    ],
    []
  );

  useEffect(() => {
    const currentSku = `${selectedColor.toLowerCase()}-${selectedSize.toLowerCase()}`;
    if (inventory[currentSku] === 0) {
      for (const color of colors) {
        for (const size of sizes) {
          const sku = `${color.value.toLowerCase()}-${size.value.toLowerCase()}`;
          if ((inventory[sku] ?? 0) > 0) {
            setSelectedColor(color.value);
            setSelectedSize(size.value);
            return;
          }
        }
      }
    }
  }, [inventory, colors, sizes, selectedColor, selectedSize]);

  const getStock = (size: string, color: string) => {
    const sku = `${color.toLowerCase()}-${size.toLowerCase()}`;
    return inventory[sku] ?? 0;
  };
  const isSoldOut = (size: string, color: string) => getStock(size, color) === 0;

  const handleCheckout = async (
    productId: "singles-16s-pack-2025" | "then-and-now-bundle-2025"
  ) => {
    setCheckingOutMusic(true);
    const cancelParams = new URLSearchParams({ musicPrice: musicPrice.toString() });
    const cancelUrl = `${cancelPath}?${cancelParams.toString()}`;

    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(musicFees.total * 100),
        productId: "singles-16s-pack-2025",
        metadata: { customPrice: musicPrice },
        cancelPath: cancelUrl,
        skipShipping: true,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.url) {
      console.error("Checkout error:", data);
      alert(data.error || "Checkout failed");
      setCheckingOutMusic(false);
      return;
    }
    window.location.href = data.url;
  };

  const [checkingOutOption, setCheckingOutOption] = useState<string | null>(null);
  const [checkingOutMusic, setCheckingOutMusic] = useState(false);

  const handleBundleCheckout = async () => {
    const optionKey = `${selectedColor}-${selectedSize}`;
    setCheckingOutOption(optionKey);
    const isPickup = deliveryMode === "pickup";
    const cancelParams = new URLSearchParams({
      size: selectedSize,
      color: selectedColor,
      delivery: deliveryMode,
      bundlePrice: bundlePrice.toString(),
    });
    const cancelUrl = `${cancelPath}?${cancelParams.toString()}`;

    const response = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(bundleFees.total * 100),
        productId: "then-and-now-bundle-2025",
        metadata: {
          size: selectedSize,
          color: selectedColor,
          deliveryMode,
          customPrice: bundlePrice,
        },
        cancelPath: cancelUrl,
        skipShipping: isPickup,
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.url) {
      console.error("Checkout error:", data);
      alert(data.error || "Checkout failed");
      setCheckingOutOption(null);
      return;
    }
    window.location.href = data.url;
  };

  const isCurrentSelectionSoldOut = isSoldOut(selectedSize, selectedColor);
  const anyCheckingOut = checkingOutOption !== null;

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 lg:min-h-screen">
        <div className="flex flex-col bg-[#A31628]">
          <div className="flex flex-col p-6 sm:p-8 pb-0 sm:pb-0">
            <h2 className="text-white font-semibold text-2xl sm:text-3xl">
              Buy Then & Now Bundle
              <p className="font-normal text-white/80 text-base lg:text-lg">
                Includes one Exhibit PSD shirt and Singles & 16s Pack (2025)
              </p>
            </h2>
          </div>

          {/* Options */}
          <div className="mt-4 sm:mt-5">
            {/* Color */}
            <div className="flex">
              <span className="text-white text-lg sm:text-xl font-semibold shrink-0 w-32 sm:w-40 px-6 sm:px-8 py-4 flex items-center">
                Color
              </span>
              {colors.map((color) => {
                const allSizesOutForColor = sizes.every((s) => isSoldOut(s.value, color.value));
                return (
                  <button
                    key={color.value}
                    onClick={() => {
                      setSelectedColor(color.value);
                      if (isSoldOut(selectedSize, color.value)) {
                        const availableSize = sizes.find((s) => !isSoldOut(s.value, color.value));
                        if (availableSize) setSelectedSize(availableSize.value);
                      }
                    }}
                    disabled={allSizesOutForColor}
                    className={`flex-1 py-4 transition-all flex items-center justify-center gap-2 ${
                      allSizesOutForColor
                        ? "opacity-40 cursor-not-allowed text-white/40"
                        : selectedColor === color.value
                        ? "bg-white/20 text-white"
                        : "text-white/50 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedColor === color.value && !allSizesOutForColor
                          ? "border-white"
                          : "border-white/40"
                      }`}
                    >
                      {selectedColor === color.value && !allSizesOutForColor && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="text-sm sm:text-base font-medium">
                      {color.name}
                      {allSizesOutForColor && (
                        <span className="text-xs ml-1 text-red-300">(Sold Out)</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Step 2: Size */}
            <div className="flex">
              <span className="text-white text-lg sm:text-xl font-semibold shrink-0 w-32 sm:w-40 px-6 sm:px-8 py-4 flex items-center">
                Size
              </span>
              {sizes.map((size) => {
                const soldOut = isSoldOut(size.value, selectedColor);
                return (
                  <button
                    key={size.value}
                    onClick={() => !soldOut && setSelectedSize(size.value)}
                    disabled={soldOut}
                    className={`flex-1 py-4 transition-all flex items-center justify-center gap-2 ${
                      soldOut
                        ? "opacity-40 cursor-not-allowed text-white/40"
                        : selectedSize === size.value
                        ? "bg-white/20 text-white"
                        : "text-white/50 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedSize === size.value && !soldOut ? "border-white" : "border-white/40"
                      }`}
                    >
                      {selectedSize === size.value && !soldOut && (
                        <span className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </span>
                    <span className="text-sm sm:text-base font-medium">
                      {size.name}
                      {soldOut && <span className="text-xs ml-1 text-red-300">(Sold Out)</span>}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Delivery */}
            <div className="flex">
              <span className="text-white text-lg sm:text-xl font-semibold shrink-0 w-32 sm:w-40 px-6 sm:px-8 py-4 flex items-center">
                Delivery
              </span>
              <button
                onClick={() => setDeliveryMode("pickup")}
                className={`flex-1 py-4 transition-all flex items-center justify-center gap-2 ${
                  deliveryMode === "pickup"
                    ? "bg-white/20 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    deliveryMode === "pickup" ? "border-white" : "border-white/40"
                  }`}
                >
                  {deliveryMode === "pickup" && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                <span className="text-sm sm:text-base font-medium">
                  Pick Up <span className="font-normal opacity-70">free</span>
                </span>
              </button>
              <button
                onClick={() => setDeliveryMode("delivery")}
                className={`flex-1 py-4 transition-all flex items-center justify-center gap-2 ${
                  deliveryMode === "delivery"
                    ? "bg-white/20 text-white"
                    : "text-white/50 hover:text-white hover:bg-white/10"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    deliveryMode === "delivery" ? "border-white" : "border-white/40"
                  }`}
                >
                  {deliveryMode === "delivery" && (
                    <span className="w-2 h-2 rounded-full bg-white" />
                  )}
                </span>
                <span className="text-sm sm:text-base font-medium">
                  Ship <span className="font-normal opacity-70">+$7</span>
                </span>
              </button>
            </div>

            {/* Price */}
            <div className="grid grid-cols-[1fr_auto_auto] bg-[#8A1222]">
              <div className="px-6 sm:px-8 py-4">
                <label className="text-white text-base sm:text-xl font-semibold whitespace-nowrap">
                  Pay what you want{" "}
                  <span className="font-normal text-white/70 tabular-nums">
                    from ${PRICING["then-and-now-bundle-2025"]}
                  </span>
                </label>
                <p className="text-white/50 text-sm sm:text-base tabular-nums">
                  ${bundlePrice} + ${(bundleFees.total - bundlePrice).toFixed(2)} processing
                  {deliveryMode === "delivery" && ` + $${SHIPPING} shipping`}
                </p>
              </div>
              <button
                onClick={() =>
                  setBundlePrice((p) => Math.max(PRICING["then-and-now-bundle-2025"], p - 5))
                }
                className="aspect-square flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/10 transition-colors disabled:opacity-30 disabled:hover:bg-white/5 text-white/70 hover:text-white"
                disabled={bundlePrice <= PRICING["then-and-now-bundle-2025"]}
              >
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setBundlePrice((p) => p + 5);
                  showBundleToast(5);
                }}
                className="aspect-square flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
                </svg>
              </button>
            </div>
          </div>

          {/* Buy button */}
          <button
            onClick={handleBundleCheckout}
            disabled={isCurrentSelectionSoldOut || anyCheckingOut}
            className={`py-5 sm:py-6 px-6 sm:px-8 transition-all text-left flex items-center justify-between ${
              isCurrentSelectionSoldOut
                ? "bg-white/50 text-[#A31628]/50 cursor-not-allowed"
                : selectedColor === "black"
                  ? "bg-black text-white hover:bg-black/90"
                  : "bg-white text-[#A31628] hover:bg-white/90"
            }`}
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="text-4xl sm:text-5xl font-bold tabular-nums">
                  {anyCheckingOut || isCurrentSelectionSoldOut
                    ? (anyCheckingOut ? "Processing..." : "Sold Out")
                    : `$${(bundleFees.total + (deliveryMode === "delivery" ? SHIPPING : 0)).toFixed(2)}`}
                </span>
                {bundleToast && !anyCheckingOut && !isCurrentSelectionSoldOut && (
                  <span className={`text-lg sm:text-xl font-medium transition-opacity duration-500 tabular-nums ${
                    bundleToast.fading ? "opacity-0" : "opacity-100"
                  }`}>
                    +${bundleToast.amount} Thank you!
                  </span>
                )}
              </div>
              <span className={`block text-base sm:text-lg mt-1 ${anyCheckingOut || isCurrentSelectionSoldOut ? "invisible" : ""}`}>
                Buy {selectedColor} {selectedSize.toLowerCase()} shirt and music
              </span>
            </div>
            <svg
              className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 ml-4 ${anyCheckingOut || isCurrentSelectionSoldOut ? "invisible" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="relative min-h-[200px] sm:min-h-[250px] lg:flex-1 lg:min-h-0 overflow-hidden w-full">
            <Image
              src="/images/merch/lu-psd-merch.JPG"
              alt="Friend wearing Exhibit PSD T-Shirt"
              fill
              className="object-cover object-bottom"
            />
            <button
              onClick={() => setShowInfo(!showInfo)}
              className="absolute top-4 right-4 transition-all z-10"
              aria-label="Show info"
            >
              <InfoIcon
                className={`w-9 h-9 transition-colors duration-300 ${
                  showInfo ? "text-[#A31628]" : "text-black/40"
                }`}
              />
            </button>
            <div
              className={`absolute top-0 right-0 h-full w-1/2 bg-neutral-900/80 backdrop-blur-sm transform transition-transform duration-300 ease-out ${
                showInfo ? "translate-x-0" : "translate-x-full"
              }`}
            >
              <div className="p-4 sm:p-6 h-full flex flex-col justify-center">
                <h3 className="font-semibold text-white text-lg lg:text-xl mb-2">
                  From The Archives: Exhibit PSD
                </h3>
                <p className="text-white/80 text-sm lg:text-base">
                  My first design, a decade in the making. The "PSD" logo from my original rap
                  moniker, first sketched in college at the University of Florida. 100% cotton, made
                  to last.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Download Card - Tap anywhere to purchase */}
        {/* Note: Using div instead of button to avoid iOS Safari nested button issues */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => !checkingOutMusic && handleCheckout("singles-16s-pack-2025")}
          onKeyDown={(e) => { if (!checkingOutMusic && (e.key === "Enter" || e.key === " ")) handleCheckout("singles-16s-pack-2025"); }}
          onMouseEnter={() => setHoveringMusicIncrement(false)}
          className={`bg-[#1628A3] text-left transition-colors group flex flex-col ${
            checkingOutMusic ? "cursor-wait" : "cursor-pointer hover:bg-[#1a2eb8]"
          }`}
        >
          <div className="flex flex-col p-6 sm:p-8 pb-0 sm:pb-0">
            <h2 className="text-white font-semibold text-2xl sm:text-3xl">
              Buy Singles & 16s Pack (2025)
              <p className="font-normal text-white/80 text-base lg:text-lg">
                Digital download with mp3s and lyricbook
              </p>
            </h2>
          </div>
          <div className="px-6 sm:px-8 py-4">
            <p className="text-white/80 text-base lg:text-lg">
              A "16" is the number of bars, the typical length of one rap verse. I write every bar
              myself, and grabbing this pack supports my independence the same as streaming
              "Patience" 3,000 times!
            </p>
          </div>
          {/* Price - stop propagation to prevent checkout when adjusting price */}
          <div
            className="grid grid-cols-[1fr_auto_auto] bg-[#111D7A] mt-4 sm:mt-5"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setHoveringMusicIncrement(true)}
            onMouseLeave={() => setHoveringMusicIncrement(false)}
          >
            <div className="px-6 sm:px-8 py-4">
              <label className="text-white text-base sm:text-xl font-semibold whitespace-nowrap">
                Pay what you want{" "}
                <span className="font-normal text-white/70 tabular-nums">
                  from ${PRICING["singles-16s-pack-2025"]}
                </span>
              </label>
              <p className="text-white/50 text-sm sm:text-base tabular-nums">
                ${musicPrice} + ${(musicFees.total - musicPrice).toFixed(2)} processing
              </p>
            </div>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setMusicPrice((p) => Math.max(PRICING["singles-16s-pack-2025"], p - 2));
              }}
              disabled={musicPrice <= PRICING["singles-16s-pack-2025"]}
              className="aspect-square flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/10 transition-colors text-white/70 hover:text-white disabled:opacity-30 disabled:pointer-events-none"
            >
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
              </svg>
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setMusicPrice((p) => p + 2);
                showMusicToast(2);
              }}
              className="aspect-square flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/10 transition-colors text-white/70 hover:text-white"
            >
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
              </svg>
            </button>
          </div>

          {/* Tap to buy indicator - matches red panel buy button structure (flex) */}
          <div
            className={`py-5 sm:py-6 px-6 sm:px-8 transition-all flex items-center justify-between ${
              hoveringMusicIncrement
                ? "bg-transparent text-white/50"
                : "bg-white/10 text-white group-hover:bg-white/20"
            }`}
          >
            <div>
              <div className="flex items-center gap-3">
                <span className="text-4xl sm:text-5xl font-bold tabular-nums">
                  {checkingOutMusic ? "Processing..." : `$${musicFees.total.toFixed(2)}`}
                </span>
                {musicToast && !checkingOutMusic && (
                  <span className={`text-lg sm:text-xl font-medium transition-opacity duration-500 tabular-nums ${
                    musicToast.fading ? "opacity-0" : "opacity-100"
                  }`}>
                    +${musicToast.amount} Thank you!
                  </span>
                )}
              </div>
              <span className={`block text-base sm:text-lg mt-1 ${checkingOutMusic ? "invisible" : ""}`}>
                Tap anywhere to purchase
              </span>
            </div>
            <svg
              className={`w-8 h-8 sm:w-10 sm:h-10 shrink-0 ml-4 ${checkingOutMusic ? "invisible" : ""}`}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>

          {/* Description + Tracklist */}
          <div className="flex flex-col p-6 sm:p-8 gap-4 sm:gap-5">
            <div className="space-y-1">
              {TRACKLIST.map((track) => (
                <div
                  key={track.name}
                  className="py-3 pl-4 pr-3 border-l-2 border-white/40 flex items-center justify-between"
                >
                  <span className="font-bebas text-white text-3xl lg:text-4xl">{track.name}</span>
                  <span className="font-mono text-white/70 text-xl lg:text-2xl">
                    {track.duration}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
