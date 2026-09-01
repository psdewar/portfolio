"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { PlayIcon } from "@phosphor-icons/react";
import { ColorSwatches, SizeGrid } from "./TeePickers";
import { useTeeCheckout } from "./useTeeCheckout";
import { venmoPayUrl } from "./PaymentModal";
import { EXHIBIT_STORY } from "../data/exhibit-psd";

const EmbeddedTeeCheckout = dynamic(() => import("./EmbeddedTeeCheckout"), { ssr: false });

const PRODUCT_ID = "tee-exhibit-psd";
const INK = "#b02b1e";
const PRICE = "30";

const COLORS = [
  { id: "black", name: "Black", hex: "#141414" },
  { id: "white", name: "White", hex: "#f2f0ea" },
] as const;

const SIZES = ["S", "M", "L"] as const;

const FINE_PRINT = [
  "$1.21 processing fee with card",
  "Available when you attend From The Ground Up",
];

export function ExhibitPsdContent({
  section,
  embedded = true,
  stacked = false,
  onCrossSell,
}: {
  section?: "media" | "controls";
  embedded?: boolean;
  stacked?: boolean;
  onCrossSell?: () => void;
} = {}) {
  const [storyOpen, setStoryOpen] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [footerH, setFooterH] = useState(256);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setFooterH(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const {
    colorId,
    size,
    sizeLabel,
    loading,
    error,
    showCheckout,
    selectColor,
    setSize,
    startCard,
    trackCheckout,
    closeCheckout,
  } = useTeeCheckout({
    productId: PRODUCT_ID,
    colors: COLORS,
    sizes: SIZES,
    defaultSize: "M",
    embedded,
    event: "checkout_initiated",
    errorText: "Something went wrong starting checkout. Please try again.",
  });

  if (section === "media") {
    return (
      <div className={`relative w-full overflow-hidden bg-neutral-900 [container-type:inline-size] ${stacked ? "" : "lg:h-full lg:min-h-60 lg:rounded-2xl"}`}>
        <div className={`grid ${stacked ? "" : "lg:absolute lg:inset-0 lg:grid-rows-[3fr_4fr]"}`}>
          <div
            className={`relative aspect-[2/1] min-h-0 cursor-pointer ${stacked ? "" : "lg:aspect-auto"}`}
            onClick={() => setStoryOpen(true)}
          >
            <Image
              src="/images/merch/lu-psd-merch.JPG"
              alt="With the homie Ludger"
              fill
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover object-bottom"
            />
            <div className="absolute left-0 top-0 p-3">
              <div className="rounded-lg bg-black/30 px-2 py-1 backdrop-blur-sm">
                <p className="text-sm font-medium text-white">With the homie Ludger</p>
                <p className="text-xs text-white/70">Los Angeles, CA · 2018</p>
              </div>
            </div>
          </div>
          <div className="grid min-h-0 grid-cols-2">
            <div
              className={`relative aspect-[3/4] min-h-0 cursor-pointer ${stacked ? "" : "lg:aspect-auto"}`}
              onClick={() => setStoryOpen(true)}
            >
              <Image
                src="/images/merch/exhibit-psd-merch.JPG"
                alt="Exhibit PSD tees in black and white with Work In Progress mixtape CDs"
                fill
                sizes="(min-width: 1024px) 30vw, 50vw"
                className="object-cover"
              />
            </div>
            <div className={`relative aspect-[3/4] min-h-0 ${stacked ? "" : "lg:aspect-auto"}`}>
              <video
                ref={videoRef}
                src="https://assets.peytspencer.com/videos/exhibit-psd-live.mp4"
                className="h-full w-full object-cover"
                controls
                playsInline
              />
              {!videoStarted && (
                <button
                  type="button"
                  aria-label="Play the live video"
                  onClick={() => {
                    setVideoStarted(true);
                    videoRef.current?.play();
                  }}
                  className="absolute inset-0"
                >
                  <Image
                    src="/images/covers/exhibit-psd-live-cover.jpg"
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 30vw, 50vw"
                    className="object-cover object-[center_30%]"
                  />
                  <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white">
                    <PlayIcon size={22} weight="fill" />
                  </span>
                </button>
              )}
              <div className="pointer-events-none absolute left-0 top-0 p-3">
                <div className="rounded-lg bg-black/30 px-2 py-1 backdrop-blur-sm">
                  <p className="text-sm font-medium text-white">Live with the band at High Dive</p>
                  <p className="text-xs text-white/70">Gainesville, FL · 2015</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setStoryOpen(true)}
          aria-expanded={storyOpen}
          className={`absolute bottom-0 left-0 p-3 text-left transition-opacity ${
            storyOpen ? "pointer-events-none opacity-0" : "opacity-100"
          }`}
        >
          <span className="flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5 backdrop-blur-sm">
            <span className="text-xs text-white/90">Read the story</span>
            <span className="font-serif text-xs italic text-white/70">i</span>
          </span>
        </button>
        <div
          onClick={() => setStoryOpen(false)}
          className={`absolute inset-0 z-10 flex cursor-pointer flex-col gap-[clamp(0.75rem,2.5cqw,1.75rem)] overflow-y-auto bg-black/90 p-[clamp(1.25rem,4cqw,3rem)] backdrop-blur-sm transition-transform duration-300 ease-out ${
            storyOpen ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <h3 className="mt-auto font-bebas text-[clamp(2.25rem,6.5cqw,4rem)] leading-none text-white">
            Exhibit PSD
          </h3>
          <p className="text-[clamp(1rem,3.1cqw,1.5rem)] leading-relaxed text-white/85">
            {EXHIBIT_STORY}
          </p>
          <span className="mt-auto text-[clamp(0.65rem,1.2cqw,0.8rem)] uppercase tracking-[0.16em] text-white/50">
            Tap to close
          </span>
        </div>
      </div>
    );
  }

  const colorName = COLORS.find((c) => c.id === colorId)?.name ?? colorId;
  const venmoUrl = venmoPayUrl(PRICE, `Exhibit PSD tee ${sizeLabel} ${colorName}`);

  return (
    <div className="flex min-w-0 flex-col lg:!pb-0" style={{ paddingBottom: footerH }}>
      {showCheckout && (
        <EmbeddedTeeCheckout
          productId={PRODUCT_ID}
          color={colorId}
          size={sizeLabel}
          onClose={closeCheckout}
          accent={INK}
          accentText="#ffffff"
          confirmation="Your Exhibit PSD tee is reserved for the next show. Confirmation is in your inbox."
          crossSellLabel="Get the Patience tee too"
          onCrossSell={
            onCrossSell &&
            (() => {
              closeCheckout();
              onCrossSell();
            })
          }
        />
      )}
      <div
        ref={footerRef}
        className="fixed inset-x-0 z-30 bg-white/95 px-4 pb-3 pt-3 backdrop-blur [&_h2]:hidden dark:bg-gray-900/95 sm:px-6 lg:static lg:z-auto lg:bg-transparent lg:p-0 lg:backdrop-blur-0 lg:[&_h2]:block"
        style={{ bottom: "var(--player-h, 0px)" }}
      >
        <div>
          <ColorSwatches colors={COLORS} value={colorId} accent={INK} onChange={selectColor} />
          <SizeGrid
            sizes={SIZES}
            value={size}
            activeHex={INK}
            onChange={setSize}
            className="mt-3 lg:mt-5"
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:mt-6">
          <a
            href={size ? venmoUrl : undefined}
            onClick={() => trackCheckout("venmo")}
            aria-disabled={!size}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex h-14 items-center justify-center rounded-xl px-4 text-white transition-all lgtall:h-[4.5rem] lgtall:px-5 hover:brightness-110 active:scale-[0.99] ${
              size ? "" : "pointer-events-none opacity-40"
            }`}
            style={{ backgroundColor: "#008CFF" }}
          >
            <img
              src="/Venmo_Logo_Blue.png"
              alt="Venmo"
              className="h-[18px] w-auto brightness-0 invert lgtall:h-6"
            />
          </a>
          <button
            type="button"
            onClick={() => {
              trackCheckout("card");
              startCard();
            }}
            disabled={!size || loading}
            className="flex h-14 items-center justify-center rounded-xl px-4 text-white transition-all lgtall:h-[4.5rem] lgtall:px-5 hover:brightness-110 active:scale-[0.99] disabled:opacity-40"
            style={{ backgroundColor: INK }}
          >
            <span className="text-lg font-semibold lgtall:text-xl">Pay with card</span>
          </button>
        </div>
        {!size && (
          <p className="mt-2 text-center text-sm text-stone-500 dark:text-neutral-500">
            Select a size first
          </p>
        )}
        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
      <ul className="mt-4 space-y-1 text-[10px] uppercase tracking-[0.14em] text-stone-500 dark:text-neutral-500 lgtall:mt-5 lgtall:space-y-1.5 lgtall:text-xs">
        {FINE_PRINT.map((item) => (
          <li key={item} className="flex items-center gap-2">
            <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: INK }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
