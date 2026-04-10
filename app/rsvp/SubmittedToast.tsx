"use client";

import { useEffect, useRef, useState } from "react";

export default function SubmittedToast({
  slug,
  onDismiss,
}: {
  slug?: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const link = slug ? `peytspencer.com/rsvp/${slug}` : "peytspencer.com/rsvp";

  const copyLink = () =>
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setCopied(false), 2000);
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-neutral-950/60 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl p-6 bg-neutral-950"
        style={{ border: "1px solid rgba(212,165,83,0.5)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-300 transition-colors text-xl leading-none"
        >
          ×
        </button>
        <p
          className="text-[#d4a553] text-2xl font-extrabold uppercase tracking-wider mb-1"
          style={{ fontFamily: '"Parkinsans", sans-serif' }}
        >
          Submitted
        </p>
        <p className="text-neutral-300 text-sm mb-4">
          I sent my 2025 Singles & 16s Pack to your inbox as a thank you. Share this RSVP with a
          friend:
        </p>
        <button
          onClick={copyLink}
          className="flex items-center justify-between w-full gap-3 rounded-lg px-3 py-2.5"
          style={{ background: "rgba(212,165,83,0.08)", border: "1px solid rgba(212,165,83,0.2)" }}
        >
          <span
            className="text-sm text-neutral-300"
            style={{ fontFamily: '"Space Mono", monospace' }}
          >
            {link}
          </span>
          <span className="text-xs font-medium shrink-0" style={{ color: "#d4a553" }}>
            {copied ? "Copied" : "Copy"}
          </span>
        </button>
      </div>
    </div>
  );
}
