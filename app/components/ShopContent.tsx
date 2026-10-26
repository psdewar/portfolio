"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import {
  ColorSwatches,
  SizeGrid,
  TEE_COLORS,
  TEE_DEFAULT_SIZE,
  TEE_SIZES,
} from "./TeePickers";
import { useTeeCheckout } from "./useTeeCheckout";
import PaymentOptions, { venmoPayUrl } from "./PaymentOptions";

const EmbeddedTeeCheckout = dynamic(() => import("./EmbeddedTeeCheckout"), {
  ssr: false,
});

const PRODUCT_ID = "tee-patience";
const GOLD = "#c59d57";
const PRICE = "45";

const COLORS = TEE_COLORS.map((c) => ({
  ...c,
  image: `/images/merch/patience-${c.id}.jpeg`,
}));

const SIZES = TEE_SIZES;

const FINE_PRINT = ["Available when you attend From The Ground Up"];

export function ShopContent({
  embedded = false,
  section,
  stacked = false,
  onCrossSell,
  initialColor,
  syncUrl = false,
}: {
  embedded?: boolean;
  section?: "media" | "controls";
  stacked?: boolean;
  onCrossSell?: () => void;
  initialColor?: string;
  syncUrl?: boolean;
} = {}) {
  const {
    colorId,
    prevColorId,
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
    defaultSize: TEE_DEFAULT_SIZE,
    embedded,
    event: "checkout_initiated",
    errorText: "Something went wrong starting checkout. Please try again.",
    initialColorId: initialColor,
    urlParam: syncUrl ? "color" : undefined,
  });

  const [footerH, setFooterH] = useState(256);
  const footerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = footerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setFooterH(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const color = COLORS.find((c) => c.id === colorId) ?? COLORS[0];

  if (section === "media") {
    return (
      <div
        className={`relative aspect-square w-full overflow-hidden bg-white ${stacked ? "" : "lg:aspect-auto lg:h-full lg:min-h-60 lg:rounded-2xl lg:border lg:border-neutral-200 dark:lg:border-neutral-700"}`}
      >
        {COLORS.map((c) => {
          const active = c.id === colorId;
          const beneath = c.id === prevColorId && !active;
          return (
            <Image
              key={c.id}
              src={c.image}
              alt={active ? `All I Need Is Patience tee in ${c.name}` : ""}
              aria-hidden={!active}
              fill
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className={`object-contain transition-opacity duration-300 ease-out ${
                active
                  ? "z-20 opacity-100"
                  : beneath
                    ? "z-10 opacity-100"
                    : "z-0 opacity-0"
              }`}
            />
          );
        })}
      </div>
    );
  }

  if (section === "controls") {
    const venmoUrl = venmoPayUrl(
      PRICE,
      `Patience tee ${size} ${color.name}`,
    );
    return (
      <div
        className="flex min-w-0 flex-col lg:gap-6 lg:!pb-0"
        style={{ paddingBottom: footerH }}
      >
        {showCheckout && (
          <EmbeddedTeeCheckout
            productId={PRODUCT_ID}
            color={colorId}
            size={sizeLabel}
            onClose={closeCheckout}
            crossSellLabel="Get the Exhibit PSD tee too"
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
          className="fixed inset-x-0 z-30 bg-white/95 px-4 pb-3 pt-3 backdrop-blur dark:bg-gray-900/95 sm:px-6 lg:static lg:z-auto lg:flex lg:flex-col lg:gap-6 lg:bg-transparent lg:p-0 lg:backdrop-blur-0"
          style={{ bottom: "var(--player-h, 0px)" }}
        >
          <div className="lg:flex lg:flex-col lg:gap-6">
            <ColorSwatches
              colors={COLORS}
              value={colorId}
              accent={GOLD}
              onChange={selectColor}
            />
            <SizeGrid
              sizes={SIZES}
              value={size}
              activeHex={color.hex}
              onChange={setSize}
              className="mt-3 lg:mt-0"
            />
          </div>
          <div className="mt-3 lg:mt-0 lg:[&_.payment-options]:-mb-3">
            <PaymentOptions
              venmoUrl={venmoUrl}
              onCard={startCard}
              cardLoading={loading}
              cardNoFees
              blocked={!size}
              zelleNote={`Patience tee ${size} ${color.name}`}
              onSelect={(method) => method !== "zelle" && trackCheckout(method)}
            />
          </div>
          {!size && (
            <p className="mt-2 text-center text-sm text-stone-500 dark:text-neutral-500">
              Select a size first
            </p>
          )}
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
        </div>
        <ul className="mt-4 lg:mt-0 space-y-1 text-[10px] uppercase tracking-[0.14em] text-stone-500 dark:text-neutral-500 lgtall:mt-0 lgtall:space-y-1.5 lgtall:text-xs">
          {FINE_PRINT.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span
                className="mt-[calc((1lh-0.25rem)/2)] h-1 w-1 shrink-0 rounded-full"
                style={{ backgroundColor: GOLD }}
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
