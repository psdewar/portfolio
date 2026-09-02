"use client";

import { useState } from "react";
import { ShopContent } from "./ShopContent";
import { ExhibitPsdContent } from "./ExhibitPsdContent";

export type ShopTab = "patience" | "exhibit";

const TEES = [
  {
    id: "patience" as const,
    name: "Patience tee",
    price: "$45",
    accent: "#c59d57",
    accentText: "#0a0a0a",
  },
  {
    id: "exhibit" as const,
    name: "Exhibit PSD",
    price: "$30",
    accent: "#b02b1e",
    accentText: "#ffffff",
    stockLeft: 10,
  },
];

export function ShopTabs({
  initialTab,
  initialColor,
  syncUrl = true,
  stacked = false,
}: {
  initialTab: ShopTab;
  initialColor?: string;
  syncUrl?: boolean;
  stacked?: boolean;
}) {
  const [tab, setTab] = useState<ShopTab>(initialTab);

  const select = (id: ShopTab) => {
    setTab(id);
    if (!syncUrl) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("color");
    if (id === "patience") url.searchParams.delete("tab");
    else url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  };

  const Content = tab === "patience" ? ShopContent : ExhibitPsdContent;

  return (
    <div
      className={`flex min-w-0 flex-col gap-5 ${
        stacked
          ? ""
          : "lg:grid lg:h-[calc(100svh-8rem-var(--player-h,0px))] lg:min-h-[32rem] lg:grid-cols-[minmax(0,1fr)_25rem] lg:grid-rows-[auto_minmax(0,1fr)] lg:gap-x-10 lg:gap-y-4 xl:grid-cols-[minmax(0,1fr)_27rem]"
      }`}
    >
      <div
        role="tablist"
        aria-label="Shirts"
        className={`grid shrink-0 grid-cols-2 gap-3 ${stacked ? "" : "lg:col-start-1 lg:row-start-1 lg:max-w-[25rem]"}`}
      >
          {TEES.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                id={`shop-tab-${t.id}`}
                role="tab"
                type="button"
                aria-selected={active}
                aria-controls={`shop-panel-${t.id}`}
                onClick={() => select(t.id)}
                className={`relative flex min-w-0 min-h-[2.75rem] flex-col justify-center gap-1 rounded-xl border-2 px-3 py-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 sm:px-3.5 ${
                  active
                    ? "border-neutral-900 shadow-[3px_3px_0_#0a0a0a] dark:shadow-[3px_3px_0_#f5f5f4]"
                    : "border-stone-300 text-stone-600 hover:border-stone-500 dark:border-neutral-600 dark:bg-white/5 dark:text-neutral-200 dark:hover:border-neutral-400"
                }`}
                style={{
                  ["--tw-ring-color" as string]: t.accent,
                  ...(active ? { backgroundColor: t.accent, color: t.accentText } : {}),
                }}
              >
                <span className="flex w-full items-baseline justify-between gap-1.5">
                  <span className="truncate font-bebas text-xl leading-none sm:text-2xl">{t.name}</span>
                  <span className="shrink-0 font-bebas text-xl leading-none sm:text-2xl">{t.price}</span>
                </span>
                {"stockLeft" in t && (
                  <span
                    className="absolute -top-2.5 right-2 -rotate-6 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em]"
                    style={
                      active
                        ? { backgroundColor: "#ffffff", color: t.accent }
                        : { backgroundColor: t.accent, color: "#ffffff" }
                    }
                  >
                    Only {t.stockLeft} left
                  </span>
                )}
              </button>
            );
          })}
        </div>

      <div
        id={`shop-panel-${tab}`}
        role="tabpanel"
        aria-labelledby={`shop-tab-${tab}`}
        className={`-mx-4 min-w-0 sm:-mx-6 ${stacked ? "" : "lg:col-start-1 lg:row-start-2 lg:mx-0 lg:min-h-0"}`}
      >
        <Content section="media" stacked={stacked} initialColor={initialColor} syncUrl={syncUrl} />
      </div>

      <div className={`flex min-w-0 flex-col justify-center ${stacked ? "" : "lg:col-start-2 lg:row-start-2 lg:min-h-0"}`}>
        <Content
          section="controls"
          embedded
          stacked={stacked}
          initialColor={initialColor}
          syncUrl={syncUrl}
          onCrossSell={() => select(tab === "patience" ? "exhibit" : "patience")}
        />
      </div>
    </div>
  );
}
