"use client";

import { useEffect, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "@phosphor-icons/react";

const HIDDEN = "lg:hidden";
const PILL = "bg-neutral-900 dark:bg-white text-white dark:text-neutral-900";

export default function ScrollToTarget({
  targetId,
  label,
  direction,
  spacer,
}: {
  targetId: string;
  label: string;
  direction: "up" | "down";
  spacer?: boolean;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const io = new IntersectionObserver(([entry]) =>
      setShow(
        !entry.isIntersecting &&
          (direction === "up" ? entry.boundingClientRect.top < 0 : entry.boundingClientRect.top > 0),
      ),
    );
    io.observe(target);
    return () => io.disconnect();
  }, [targetId, direction]);

  const go = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(targetId)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: direction === "up" ? "center" : "start",
    });
  };

  const Icon = direction === "up" ? ArrowUpIcon : ArrowDownIcon;

  return (
    <>
      {spacer && <div aria-hidden className={`${HIDDEN} h-20`} />}
      <div
        aria-hidden={!show}
        className={`${HIDDEN} pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4 transition-opacity duration-200 ${
          show ? "opacity-100" : "opacity-0"
        }`}
        style={{ bottom: "max(1rem, var(--player-h, 0px), env(safe-area-inset-bottom))" }}
      >
        <button
          onClick={go}
          tabIndex={show ? 0 : -1}
          className={`${show ? "pointer-events-auto" : ""} inline-flex items-center gap-2 rounded-full ${PILL} font-semibold text-sm px-5 py-3 shadow-lg hover:opacity-90 transition-opacity touch-manipulation`}
        >
          <Icon size={16} weight="bold" />
          {label}
        </button>
      </div>
    </>
  );
}
