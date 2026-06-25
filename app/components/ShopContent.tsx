"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import posthog from "posthog-js";
import { TRACK_DATA } from "../data/tracks";

const EmbeddedTeeCheckout = dynamic(() => import("./EmbeddedTeeCheckout"), { ssr: false });

const PRODUCT_ID = "tee-patience";
const GOLD = "#c59d57";
const PRICE = "45";
const PATIENCE_COVER = TRACK_DATA.find((t) => t.id === "patience")?.thumbnail ?? "";

const COLORS = [
  { id: "navy", name: "Navy", hex: "#262b3f", image: "/images/merch/patience-navy.jpeg" },
  { id: "forest", name: "Forest", hex: "#2c413a", image: "/images/merch/patience-forest.jpeg" },
  { id: "maroon", name: "Maroon", hex: "#5d2c30", image: "/images/merch/patience-maroon.jpeg" },
] as const;

const SIZES = ["XS", "S", "M", "L", "XL"] as const;

const SIZE_LABELS: Record<string, string> = {
  XS: "Extra Small",
  S: "Small",
  M: "Medium",
  L: "Large",
  XL: "Extra Large",
};

const FINE_PRINT = [
  "No added fees",
  "Free shipping, U.S. only for now",
  "Ships in mid-July",
  "Secure checkout via Stripe",
];

const mono = { fontFamily: "var(--font-space-mono)" } as const;
const parkinsans = { fontFamily: "var(--font-parkinsans)" } as const;

export function ShopContent({ embedded = false }: { embedded?: boolean } = {}) {
  const [colorId, setColorId] = useState<string>(COLORS[0].id);
  const [prevColorId, setPrevColorId] = useState<string>(COLORS[0].id);
  const [size, setSize] = useState<string>("M");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  const color = COLORS.find((c) => c.id === colorId) ?? COLORS[0];

  useEffect(() => {
    const c = sessionStorage.getItem("preorderColor");
    const s = sessionStorage.getItem("preorderSize");
    if (c && COLORS.some((x) => x.id === c)) {
      setColorId(c);
      setPrevColorId(c);
    }
    if (s && (SIZES as readonly string[]).includes(s)) setSize(s);
  }, []);

  const selectColor = (id: string) => {
    if (id === colorId) return;
    setPrevColorId(colorId);
    setColorId(id);
  };

  const reserve = async () => {
    if (!size || loading) return;
    sessionStorage.setItem("preorderColor", colorId);
    sessionStorage.setItem("preorderSize", size);
    posthog.capture("preorder_initiated", { product: PRODUCT_ID, color: colorId, size });
    if (embedded) {
      setShowCheckout(true);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: PRODUCT_ID,
          metadata: { color: colorId, size: SIZE_LABELS[size] ?? size },
        }),
      });
      const { url, error: serverError } = await res.json();
      if (serverError || !url) throw new Error(serverError || "Checkout unavailable");
      window.location.href = url;
    } catch {
      setError("Something went wrong reserving your size. Please try again.");
      setLoading(false);
    }
  };

  const rise = (delay: number): React.CSSProperties => ({
    animationDelay: `${delay}ms`,
    animationFillMode: "both",
  });

  const header = (
    <div className="animate-slide-up-fade flex items-start gap-4" style={rise(0)}>
      <img
        src={PATIENCE_COVER}
        alt="Patience single cover art"
        className="h-[82px] w-[82px] shrink-0 object-cover shadow-md ring-1 ring-black/10 sm:h-[94px] sm:w-[94px]"
      />
      <h1 className="flex flex-col gap-2.5">
        <span
          className="text-base uppercase tracking-[0.32em] text-stone-500 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] dark:text-neutral-400 sm:text-lg"
          style={parkinsans}
        >
          All I Need Is
        </span>
        <span className="font-bebas text-5xl text-stone-900 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] dark:text-white sm:text-6xl">
          Patience
        </span>
        <span
          className="mt-[0.22em] text-base uppercase tracking-[0.32em] text-stone-500 [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] dark:text-neutral-400 sm:text-lg"
          style={parkinsans}
        >
          Tee (Pre-Order)
        </span>
      </h1>
    </div>
  );

  return (
    <div
      className={`flex min-w-0 flex-col ${
        embedded
          ? ""
          : "bg-stone-50 dark:bg-neutral-950 lg:min-h-[calc(100svh-4rem-var(--player-h,0px))] lg:flex-row"
      }`}
    >
      {embedded && showCheckout && (
        <EmbeddedTeeCheckout
          productId={PRODUCT_ID}
          color={colorId}
          size={SIZE_LABELS[size] ?? size}
          onClose={() => setShowCheckout(false)}
        />
      )}
      {embedded && <div className="pb-6">{header}</div>}

      <div className={`relative aspect-square bg-white ${embedded ? "-mx-4 overflow-hidden sm:mx-0 sm:w-full sm:rounded-2xl" : "w-full lg:aspect-auto lg:w-1/2"}`}>
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
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={`object-cover transition-opacity duration-300 ease-out ${embedded ? "scale-[1.15] sm:scale-100" : ""} ${
                active ? "z-20 opacity-100" : beneath ? "z-10 opacity-100" : "z-0 opacity-0"
              }`}
            />
          );
        })}
      </div>

      <div className={`flex w-full flex-col justify-center border-stone-200 pb-10 dark:border-neutral-800 ${embedded ? "pt-6" : "pt-10 px-4 sm:px-10 lg:w-1/2 lg:border-l lg:px-14 lg:py-12"}`}>
        <div className={embedded ? "w-full [&>*:first-child]:mt-0" : "mx-auto w-full max-w-md"}>
          {!embedded && header}

          <div className="animate-slide-up-fade mt-9" style={rise(70)}>
            <h2 className="font-bebas text-4xl leading-none text-stone-900 dark:text-white sm:text-5xl">
              Color
            </h2>
            <div className="mt-4 flex gap-5">
              {COLORS.map((c) => {
                const active = c.id === colorId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectColor(c.id)}
                    aria-pressed={active}
                    className="group flex flex-col items-center gap-2"
                  >
                    <span
                      className="flex h-14 w-14 items-center justify-center rounded-full ring-1 ring-inset ring-black/10 transition-transform duration-200 group-hover:scale-105"
                      style={{
                        backgroundColor: c.hex,
                        boxShadow: active ? `0 0 0 2px ${GOLD}, 0 0 0 5px ${GOLD}33` : "none",
                      }}
                    >
                      {active && (
                        <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" aria-hidden="true">
                          <path
                            d="M4 10.5L8 14.5L16 6"
                            stroke={GOLD}
                            strokeWidth="2.4"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span
                      className={`text-[11px] uppercase tracking-[0.18em] transition-colors ${
                        active ? "text-stone-900 dark:text-white" : "text-stone-400 dark:text-neutral-500"
                      }`}
                      style={mono}
                    >
                      {c.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="animate-slide-up-fade mt-8" style={rise(140)}>
            <h2 className="font-bebas text-4xl leading-none text-stone-900 dark:text-white sm:text-5xl">
              Size
            </h2>
            <div className="mt-4 grid grid-cols-5 gap-2.5 sm:gap-3">
              {SIZES.map((s) => {
                const active = s === size;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSize(s)}
                    aria-pressed={active}
                    style={active ? { backgroundColor: color.hex, borderColor: color.hex } : undefined}
                    className={`flex h-16 items-center justify-center rounded-xl border text-lg font-semibold transition-all ${
                      active
                        ? "text-white"
                        : "border-stone-300 text-stone-700 hover:border-stone-900 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-white"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={reserve}
            disabled={!size || loading}
            className={`animate-slide-up-fade mt-9 flex h-16 w-full items-center rounded-xl px-6 text-white transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 sm:h-[68px] ${
              size && !loading ? "justify-between" : "justify-center"
            }`}
            style={{ ...rise(210), backgroundColor: color.hex }}
          >
            {loading ? (
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : size ? (
              <>
                <span className="font-bebas text-3xl tracking-wide">Reserve Yours</span>
                <span className="font-bebas text-3xl">${PRICE}</span>
              </>
            ) : (
              <span className="font-bebas text-3xl tracking-wide">Select a Size</span>
            )}
          </button>

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <ul
            className="animate-slide-up-fade mt-5 space-y-1.5 text-[11px] uppercase tracking-[0.16em] text-stone-500 dark:text-neutral-500"
            style={{ ...mono, ...rise(280) }}
          >
            {FINE_PRINT.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: GOLD }} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
