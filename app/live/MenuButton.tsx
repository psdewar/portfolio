"use client";

import { useRef } from "react";
import { ListIcon, XIcon } from "@phosphor-icons/react";
import { HoverTip, useHoverTip } from "./HoverTip";

export interface MenuControl {
  open: boolean;
  onToggle: () => void;
}

const TONE_CLASS = {
  surface: "text-neutral-900 dark:text-white hover:opacity-70",
  video: "text-white hover:opacity-70 drop-shadow-lg",
};

const BRAND_TONE_CLASS = {
  marquee: "bg-[#facc15] text-black hover:opacity-80",
  video: "bg-black/40 text-white backdrop-blur hover:bg-black/55",
};

export function MenuBrand({
  open,
  onToggle,
  tone,
}: MenuControl & { tone: keyof typeof BRAND_TONE_CLASS }) {
  return (
    <button
      type="button"
      data-live-menu-button
      onClick={onToggle}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      className={`flex h-9 shrink-0 items-center gap-2 px-3 font-bebas text-[22px] leading-none tracking-tight whitespace-nowrap transition-colors ${BRAND_TONE_CLASS[tone]}`}
    >
      {open ? <XIcon size={20} weight="bold" /> : <ListIcon size={20} weight="bold" />}
      <span aria-hidden className="translate-y-[1.5px]">PEYT SPENCER</span>
    </button>
  );
}

export function MenuButton({
  open,
  onToggle,
  tone = "surface",
  className = "",
}: MenuControl & { tone?: keyof typeof TONE_CLASS; className?: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const { open: tipOpen, bind } = useHoverTip();
  return (
    <button
      ref={ref}
      type="button"
      data-live-menu-button
      onClick={onToggle}
      {...bind}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      className={`grid h-8 w-8 shrink-0 place-items-center transition-opacity ${TONE_CLASS[tone]} ${className}`}
    >
      {open ? <XIcon size={20} weight="bold" /> : <ListIcon size={20} weight="bold" />}
      <HoverTip open={tipOpen && !open} anchorRef={ref} label="Menu" side="right" />
    </button>
  );
}
