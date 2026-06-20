"use client";

import { useState } from "react";

const ASKS = ["Funding", "Hosting", "Spread the word", "Referrals"];
const GIVES = ["Entertainment", "Connection", "Faith"];

export default function BookingLoop() {
  const [open, setOpen] = useState(false);
  const [asked, setAsked] = useState<boolean[]>(() => ASKS.map(() => false));
  const count = asked.filter(Boolean).length;

  return (
    <div className="mb-8 border border-neutral-200 dark:border-neutral-800 rounded-xl">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-3 text-left"
      >
        <span className="text-sm font-medium tracking-[0.15em] uppercase text-neutral-700 dark:text-neutral-200">
          The exchange
          <span className="ml-2 normal-case tracking-normal font-normal text-neutral-400">
            are you asking for all four?
          </span>
        </span>
        <span className="flex items-center gap-3 shrink-0">
          <span className="text-xs tabular-nums text-neutral-400">{count}/4</span>
          <span className="text-neutral-400">{open ? "−" : "+"}</span>
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Ask for</div>
            <div className="flex flex-wrap gap-2">
              {ASKS.map((a, i) => (
                <label
                  key={a}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full border cursor-pointer text-sm transition-colors ${
                    asked[i]
                      ? "border-neutral-900 dark:border-white bg-neutral-900 dark:bg-white text-white dark:text-neutral-900"
                      : "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={asked[i]}
                    onChange={() => setAsked((d) => d.map((v, j) => (j === i ? !v : v)))}
                    className="sr-only"
                  />
                  {a}
                </label>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-neutral-400 mb-2">Give each show</div>
            <div className="flex flex-wrap gap-2">
              {GIVES.map((g) => (
                <span
                  key={g}
                  className="inline-flex px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm"
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
