"use client";

import { NAV_ICON } from "../Navbar";

export function FundPill({
  onClick,
  tone = "auto",
}: {
  onClick: () => void;
  tone?: "auto" | "overlay";
}) {
  const Icon = NAV_ICON["/support"];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-bebas text-lg tracking-wide transition-opacity hover:opacity-90 active:opacity-80 ${
        tone === "overlay"
          ? "bg-white text-neutral-900"
          : "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
      }`}
    >
      <Icon size={18} weight="bold" />
      Fund My Tour
    </button>
  );
}
