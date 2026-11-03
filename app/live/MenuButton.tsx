"use client";

import { useRef } from "react";
import { ListIcon, XIcon } from "@phosphor-icons/react";
import { HoverTip, useHoverTip } from "./HoverTip";
import BrandWordmark from "../components/BrandWordmark";

export interface MenuControl {
  open: boolean;
  onToggle: () => void;
}

const TONE_CLASS = {
  surface: "text-neutral-900 dark:text-white hover:opacity-70",
  video: "text-white hover:opacity-70 drop-shadow-lg",
};

export function MenuBrand({ open, onToggle }: MenuControl) {
  return (
    <button
      type="button"
      data-live-menu-button
      onClick={onToggle}
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      className="group flex h-14 shrink-0 items-center gap-2 pl-2 pr-4 font-bebas text-[26px] leading-none tracking-tight whitespace-nowrap transition-colors bg-black text-white hover:bg-neutral-800"
    >
      <span className="grid h-8 w-8 place-items-center">
        {open ? <XIcon size={20} weight="bold" /> : <ListIcon size={20} weight="bold" />}
      </span>
      <span aria-hidden className="translate-y-[1.5px]">
        <BrandWordmark />
      </span>
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
