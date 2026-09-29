"use client";

import { useLayoutEffect, useState, type RefObject } from "react";

export function useHoverTip() {
  const [open, setOpen] = useState(false);
  const bind = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onMouseDown: () => setOpen(false),
  };
  return { open, bind };
}

const SIDE_CARET_CLASS = {
  right:
    "before:absolute before:right-full before:top-1/2 before:-translate-y-1/2 before:border-[6px] before:border-transparent before:border-r-white before:content-['']",
  left: "before:absolute before:left-full before:top-1/2 before:-translate-y-1/2 before:border-[6px] before:border-transparent before:border-l-white before:content-['']",
};

export function HoverTip({
  open,
  anchorRef,
  label,
  side,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  side: "left" | "right";
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useLayoutEffect(() => {
    if (open && anchorRef.current) {
      setRect(anchorRef.current.getBoundingClientRect());
    }
  }, [open, anchorRef]);

  if (!open || !rect) return null;

  const style =
    side === "right"
      ? { left: rect.right + 2, top: rect.top + rect.height / 2, transform: "translateY(-50%)" }
      : { left: rect.left - 2, top: rect.top + rect.height / 2, transform: "translate(-100%, -50%)" };

  return (
    <span
      role="tooltip"
      className={`pointer-events-none fixed z-50 whitespace-nowrap rounded-lg bg-white px-2 py-1.5 text-[15px] font-medium leading-none text-neutral-900 shadow-lg animate-[live-tip_120ms_ease_150ms_both] ${SIDE_CARET_CLASS[side]}`}
      style={style}
    >
      {label}
    </span>
  );
}
