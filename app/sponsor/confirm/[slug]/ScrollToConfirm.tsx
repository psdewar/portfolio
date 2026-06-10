"use client";

import { useEffect, useState } from "react";
import { ArrowUpIcon } from "@phosphor-icons/react";

export default function ScrollToConfirm() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const form = document.getElementById("confirm-form");
    if (!form) return;
    const io = new IntersectionObserver(([entry]) =>
      setShow(!entry.isIntersecting && entry.boundingClientRect.top < 0),
    );
    io.observe(form);
    return () => io.disconnect();
  }, []);

  const back = () => {
    document.getElementById("confirm-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <>
      <div aria-hidden className="lg:hidden h-20" />
      <div
        aria-hidden={!show}
        className={`lg:hidden fixed inset-x-0 z-40 flex justify-center px-4 transition-opacity duration-200 ${
          show ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ bottom: "max(1rem, var(--player-h, 0px), env(safe-area-inset-bottom))" }}
      >
      <button
        onClick={back}
        className="inline-flex items-center gap-2 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold text-sm px-5 py-3 shadow-lg hover:opacity-90 transition-opacity"
      >
        <ArrowUpIcon size={16} weight="bold" />
        Scroll up to confirm
      </button>
      </div>
    </>
  );
}
