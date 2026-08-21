"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { ColorSwatches, SizeGrid } from "./TeePickers";
import { useTeeCheckout } from "./useTeeCheckout";
import { venmoPayUrl } from "./PaymentModal";

const EmbeddedTeeCheckout = dynamic(() => import("./EmbeddedTeeCheckout"), { ssr: false });

const PRODUCT_ID = "tee-patience";
const GOLD = "#c59d57";
const PRICE = "45";

const COLORS = [
  { id: "navy", name: "Navy", hex: "#262b3f", image: "/images/merch/patience-navy.jpeg" },
  { id: "forest", name: "Forest", hex: "#2c413a", image: "/images/merch/patience-forest.jpeg" },
  { id: "maroon", name: "Maroon", hex: "#5d2c30", image: "/images/merch/patience-maroon.jpeg" },
] as const;

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

const FINE_PRINT = ["Available when you attend From The Ground Up"];

export function ShopContent({
  embedded = false,
  section,
  onCrossSell,
}: {
  embedded?: boolean;
  section?: "media" | "controls";
  onCrossSell?: () => void;
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
    defaultSize: "M",
    embedded,
    event: "checkout_initiated",
    errorText: "Something went wrong starting checkout. Please try again.",
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
      <div className="relative aspect-square w-full overflow-hidden bg-white lg:aspect-auto lg:h-full lg:min-h-60 lg:rounded-2xl">
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
              sizes="(min-width: 1024px) 45vw, 100vw"
              className={`object-cover transition-opacity duration-300 ease-out ${
                active ? "z-20 opacity-100" : beneath ? "z-10 opacity-100" : "z-0 opacity-0"
              }`}
            />
          );
        })}
      </div>
    );
  }

  if (section === "controls") {
    const venmoUrl = venmoPayUrl(PRICE, `Patience tee ${sizeLabel} ${color.name}`);
    return (
      <div className="flex min-w-0 flex-col lg:!pb-0" style={{ paddingBottom: footerH }}>
        {showCheckout && (
          <EmbeddedTeeCheckout
            productId={PRODUCT_ID}
            color={colorId}
            size={sizeLabel}
            onClose={closeCheckout}
            crossSellLabel="Get the Exhibit PSD tee too"
            onCrossSell={onCrossSell && (() => { closeCheckout(); onCrossSell(); })}
          />
        )}
        <div
          ref={footerRef}
          className="fixed inset-x-0 z-30 bg-white/95 px-4 pb-3 pt-3 backdrop-blur [&_h2]:hidden dark:bg-gray-900/95 sm:px-6 lg:static lg:z-auto lg:bg-transparent lg:p-0 lg:backdrop-blur-0 lg:[&_h2]:block"
          style={{ bottom: "var(--player-h, 0px)" }}
        >
          <div>
            <ColorSwatches colors={COLORS} value={colorId} accent={GOLD} onChange={selectColor} />
            <SizeGrid
              sizes={SIZES}
              value={size}
              activeHex={color.hex}
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
              style={{ backgroundColor: color.hex }}
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
        <ul
          className="mt-4 space-y-1 text-[10px] uppercase tracking-[0.14em] text-stone-500 dark:text-neutral-500 lgtall:mt-5 lgtall:space-y-1.5 lgtall:text-xs"
        >
          {FINE_PRINT.map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: GOLD }} />
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
}
