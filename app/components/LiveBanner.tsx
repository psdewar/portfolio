"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useLiveStatus } from "../hooks/useLiveStatus";

function formatCountdown(streamTime: number): string | null {
  const now = Date.now();
  const diff = streamTime - now;

  if (diff < 0) return null; // past
  if (diff > 60 * 60 * 1000) return null; // more than 1h away

  const hours = Math.floor(diff / (60 * 60 * 1000));
  const mins = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));

  if (hours > 0) return `${hours}H ${mins}M`;
  return `${mins} MIN`;
}

function formatStreamTime(iso: string): string {
  const date = new Date(iso);
  const hour = date.toLocaleTimeString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: undefined,
    hour12: true,
  });
  return `TODAY ${hour.toUpperCase()} PT`;
}

export default function LiveBanner() {
  const [nextStream, setNextStream] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<string | null>(null);
  const { online } = useLiveStatus();

  useEffect(() => {
    fetch("/api/schedule")
      .then((res) => res.json())
      .then((data) => setNextStream(data.nextStream || null))
      .catch(() => {});
  }, []);

  // Update countdown every minute
  useEffect(() => {
    if (!nextStream) return;

    const update = () => setCountdown(formatCountdown(new Date(nextStream).getTime()));
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [nextStream]);

  // Live now - red banner
  if (online) {
    return (
      <Link
        href="/live"
        className="fixed top-4 inset-x-0 z-50 animate-fade-in flex justify-center pointer-events-none"
      >
        <div className="pointer-events-auto flex items-center gap-2 bg-red-600 text-white px-4 py-2 shadow-[0_0_20px_rgba(220,38,38,0.5)] hover:shadow-[0_0_30px_rgba(220,38,38,0.7)] transition-shadow animate-pulse-subtle">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full bg-white opacity-75" />
            <span className="relative inline-flex h-2 w-2 bg-white" />
          </span>
          <span className="font-bold text-sm uppercase tracking-widest">
            Live
          </span>
        </div>
      </Link>
    );
  }

  // Upcoming within 1h - subtle banner
  if (countdown && nextStream) {
    return (
      <Link
        href="/live"
        className="fixed top-4 inset-x-0 z-50 animate-fade-in flex justify-center pointer-events-none"
      >
        <div className="pointer-events-auto flex items-center gap-2 bg-neutral-900/95 text-white px-5 py-2 backdrop-blur-sm border border-neutral-700 hover:border-neutral-500 transition-colors">
          <span className="font-bold text-sm uppercase tracking-widest text-amber-400">
            Live in {countdown}
          </span>
        </div>
      </Link>
    );
  }

  return null;
}
