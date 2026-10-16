"use client";

import { useEffect, useState } from "react";

const toMs = (v: string) => {
  const n = parseFloat(v);
  if (!n) return 320;
  return v.trim().endsWith("ms") ? n : n * 1000;
};

export const motion = () => {
  const cs = getComputedStyle(document.querySelector(".ci") ?? document.documentElement);
  return {
    ms: toMs(cs.getPropertyValue("--ck-dur")),
    ease: cs.getPropertyValue("--ck-ease").trim() || "cubic-bezier(.2,.8,.2,1)",
  };
};

export function Mark({ done, pop = false, empty = false }: { done: boolean; pop?: boolean; empty?: boolean }) {
  if (done) {
    return (
      <span className="mk">
        <svg className={pop ? "pop" : undefined} viewBox="0 0 14 14" aria-hidden="true">
          <circle cx="7" cy="7" r="7" fill="#d4a553" />
          <path
            d="M3.8 7.2l2.2 2.2 4.2-4.4"
            fill="none"
            stroke="#262b3f"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="mk">
      {empty ? (
        <svg viewBox="0 0 14 14" aria-hidden="true">
          <circle cx="7" cy="7" r="6.2" fill="none" stroke="rgba(38,43,63,0.4)" strokeWidth="1.5" />
        </svg>
      ) : (
        <svg viewBox="0 0 14 14" aria-hidden="true">
          <circle cx="7" cy="7" r="7" fill="#d5d8de" />
          <path
            d="M3.8 7.2l2.2 2.2 4.2-4.4"
            fill="none"
            stroke="#fff"
            strokeOpacity=".7"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export function Lead({
  done = false,
  pop = false,
  empty = false,
  mark = true,
  children,
}: {
  done?: boolean;
  pop?: boolean;
  empty?: boolean;
  mark?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <span className={`lead${children ? "" : " plain"}`}>
      {children}
      {mark && <Mark done={done} pop={pop} empty={empty} />}
    </span>
  );
}

export const DoneText = ({ done }: { done: boolean }) =>
  done ? <span className="sr-only">, done</span> : null;

const lineProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

export function Chev() {
  return (
    <svg className="chev" viewBox="0 0 24 24" {...lineProps} aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg className="dl" viewBox="0 0 24 24" {...lineProps} aria-hidden="true">
      <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M4.5 19h15" />
    </svg>
  );
}

export function UploadIcon() {
  return (
    <svg className="dl" viewBox="0 0 24 24" {...lineProps} aria-hidden="true">
      <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M4.5 19h15" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

export const reducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function PhotosIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M21 16l-5-5-9 9" />
    </svg>
  );
}

export function StepShell({
  id,
  n,
  stop = false,
  open,
  linked,
  onToggle,
  lead,
  title,
  sub,
  done = false,
  two = true,
  rootRef,
  after,
  children,
}: {
  id?: string;
  n?: number;
  stop?: boolean;
  open: boolean;
  linked: boolean;
  onToggle: () => void;
  lead: React.ReactNode;
  title: React.ReactNode;
  sub?: React.ReactNode;
  done?: boolean;
  two?: boolean;
  rootRef?: React.Ref<HTMLDivElement>;
  after?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      ref={rootRef}
      className={`${stop ? "stop" : "st"}${open ? " open" : ""}${linked ? " linked" : ""}`}
      data-n={n}
      id={id}
    >
      <button type="button" className={`srow${two ? " two" : ""}`} aria-expanded={open} onClick={onToggle}>
        {lead}
        <span className="t">
          {title}
          {sub && <span className="m">{sub}</span>}
        </span>
        <Chev />
        <DoneText done={done} />
      </button>
      <div className="body">
        <div className="inner">{children}</div>
      </div>
      {after}
    </div>
  );
}
