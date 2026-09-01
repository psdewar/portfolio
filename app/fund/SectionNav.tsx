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
  const rowRef = useRef<HTMLDivElement>(null);
  const indRef = useRef<HTMLSpanElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const pinned = useRef<string | null>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      if (pinned.current) {
        setActive(pinned.current);
        return;
      }
      const navH = rowRef.current?.parentElement?.offsetHeight ?? 48;
      const line = navH + 20;
      const y = window.scrollY;
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const points = sections.map((el) => el.getBoundingClientRect().top + y - line);
      const clamped = points.findIndex((p) => p > maxScroll);
      if (clamped !== -1) {
        const start = clamped === 0 ? 0 : points[clamped - 1];
        const n = points.length - clamped;
        for (let i = 0; i < n; i++) {
          points[clamped + i] = start + ((maxScroll - start) * (i + 1)) / n;
        }
      }
      let current = sections[0].id;
      points.forEach((p, i) => {
        if (y + 2 >= p) current = sections[i].id;
      });
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
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const io = new IntersectionObserver(
      ([entry]) => setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const row = rowRef.current;
    const ind = indRef.current;
    const chip = row?.querySelector<HTMLElement>('[aria-current="true"]');
    if (!row || !ind || !chip) return;
    ind.style.transform = `translateX(${chip.offsetLeft}px)`;
    ind.style.width = `${chip.offsetWidth}px`;
    const margin = parseFloat(getComputedStyle(chip).marginLeft) || 0;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
    const padLeft = parseFloat(getComputedStyle(row).paddingLeft) || 0;
    row.scrollTo({ left: Math.max(0, chip.offsetLeft - margin - padLeft), behavior });
    requestAnimationFrame(() => ind.setAttribute("data-live", ""));
  }, [active]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="secnav-sentinel" ref={sentinelRef} aria-hidden="true" />
      <nav aria-label="On this page" className="secnav" data-stuck={stuck || undefined}>
        <div className="secnav-row" ref={rowRef}>
          <span className="secnav-ind" ref={indRef} aria-hidden="true" />
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
        .secnav-sentinel { height: 1px; margin-bottom: -1px; }
        .secnav {
          position: sticky;
          top: env(safe-area-inset-top, 0px);
          z-index: 20;
          background: var(--navy);
          margin: 0 calc(50% - 50vw);
          width: 100vw;
        }
        .secnav::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 100%;
          height: 48px;
          background: var(--navy);
          opacity: 0;
          pointer-events: none;
        }
        .secnav[data-stuck]::before { opacity: 1; }
        .secnav-row {
          position: relative;
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .secnav-row::-webkit-scrollbar { display: none; }
        .secnav-row::after { content: ""; flex: 0 0 calc(100% - 120px); }
        @media (min-width: 640px) {
          .secnav-row { padding-left: max(24px, calc(50% - 366px)); scroll-padding-left: max(24px, calc(50% - 366px)); }
        }
        .secnav-ind {
          position: absolute;
          left: 0;
          bottom: 0;
          height: 40px;
          width: 0;
          border-radius: 10px 10px 0 0;
          background: var(--bg);
          box-shadow: inset 0 3px 0 var(--gold);
          pointer-events: none;
        }
        .secnav-ind[data-live] {
          transition: transform 0.32s cubic-bezier(0.4, 0, 0.2, 1), width 0.32s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .secnav-ind::before,
        .secnav-ind::after {
          content: "";
          position: absolute;
          bottom: 0;
          width: 8px;
          height: 8px;
        }
        .secnav-ind::before {
          right: 100%;
          background: radial-gradient(circle at 0 0, transparent 8px, var(--bg) 8.5px);
        }
        .secnav-ind::after {
          left: 100%;
          background: radial-gradient(circle at 100% 0, transparent 8px, var(--bg) 8.5px);
        }
        .secnav .secnav-chip {
          position: relative;
          z-index: 1;
          flex: 0 0 auto;
          scroll-snap-align: start;
          display: inline-flex;
          align-items: center;
          min-height: 48px;
          padding: 0 16px;
          font-size: var(--fs-sm);
          font-weight: 600;
          color: rgba(255, 255, 255, 0.78);
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.2s ease 0.1s;
        }
        @media (hover: hover) {
          .secnav .secnav-chip:hover { color: #fff; }
        }
        .secnav .secnav-chip:focus-visible {
          outline: 2px solid #fff;
          outline-offset: -2px;
        }
        .secnav .secnav-chip[aria-current="true"] {
          align-self: flex-end;
          min-height: 40px;
          margin: 0 8px;
          padding: 0 8px;
          scroll-margin-left: 8px;
          font-size: var(--fs-lg);
          color: var(--paper);
        }
        @media print {
          .secnav { display: none; }
        }
        @media (prefers-reduced-motion: reduce) {
          .secnav .secnav-chip, .secnav-ind[data-live] { transition: none; }
        }
      `}</style>
      </nav>
    </>
  );
}
