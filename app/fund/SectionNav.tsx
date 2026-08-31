"use client";

import { useEffect, useRef, useState } from "react";
import posthog from "posthog-js";

export default function SectionNav({
  items,
  trip,
  onJump,
}: {
  items: { id: string; label: string }[];
  trip: string;
  onJump?: (id: string) => void;
}) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const [stuck, setStuck] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const pinned = useRef<string | null>(null);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (navRef.current) setStuck(navRef.current.getBoundingClientRect().top <= 0 && window.scrollY > 0);
      if (pinned.current) {
        setActive(pinned.current);
        return;
      }
      if (navRef.current) setStuck(navRef.current.getBoundingClientRect().top <= 0 && window.scrollY > 0);
      const doc = document.documentElement;
      const atBottom = window.innerHeight + window.scrollY >= doc.scrollHeight - 2;
      if (atBottom) {
        setActive(sections[sections.length - 1].id);
        return;
      }
      const line = window.innerHeight * 0.35;
      let current = sections[0].id;
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    const unpin = () => {
      pinned.current = null;
      onScroll();
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("wheel", unpin, { passive: true });
    window.addEventListener("touchstart", unpin, { passive: true });
    window.addEventListener("keydown", unpin);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("wheel", unpin);
      window.removeEventListener("touchstart", unpin);
      window.removeEventListener("keydown", unpin);
    };
  }, [items]);

  useEffect(() => {
    const row = rowRef.current;
    const chip = row?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!row || !chip) return;
    const pad = window.innerWidth >= 640 ? 40 : 16;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    row.scrollTo({ left: Math.max(0, chip.offsetLeft - pad), behavior });
  }, [active]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="On this page" className="secnav" ref={navRef} data-stuck={stuck || undefined}>
      <div className="secnav-row" ref={rowRef}>
        {items.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="secnav-chip"
            aria-current={active === item.id ? "true" : undefined}
            onClick={() => {
              pinned.current = item.id;
              setActive(item.id);
              posthog.capture("fund_section_jump", { trip, section: item.id });
              onJump?.(item.id);
            }}
          >
            {item.label}
          </a>
        ))}
      </div>
      <style>{`
        .secnav {
          position: sticky;
          top: 0;
          z-index: 20;
          background: var(--bg);
          border-bottom: 1px solid transparent;
          margin: 16px calc(50% - 50vw) 0;
          width: 100vw;
        }
        .secnav-row {
          position: relative;
          max-width: 780px;
          margin: 0 auto;
          display: flex;
          gap: 8px;
          padding: 10px 16px;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scroll-padding: 0 16px;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .secnav[data-stuck] { border-bottom-color: var(--rule); }
        .secnav-row::-webkit-scrollbar { display: none; }
        @media (max-width: 639px) {
          .secnav-row::after { content: ""; flex: 0 0 calc(100% - 120px); }
        }
        @media (min-width: 640px) {
          .secnav-row { padding: 10px 40px; scroll-padding: 0 40px; }
        }
        .secnav-chip {
          flex: 0 0 auto;
          scroll-snap-align: start;
          display: inline-flex;
          align-items: center;
          min-height: 44px;
          padding: 0 18px;
          border-radius: 999px;
          font-size: var(--fs-sm);
          font-weight: 700;
          color: var(--act-text);
          border: 1.5px solid var(--act-border);
          background: var(--act-bg);
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
        }
        .secnav-chip:focus-visible {
          outline: 2px solid var(--gold);
          outline-offset: 2px;
        }
        .secnav-chip[aria-current="true"] {
          color: var(--gold);
          border-color: var(--navy);
          background: var(--navy);
        }
        @media print {
          .secnav { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .secnav-chip { transition: none; }
        }
      `}</style>
    </nav>
  );
}
