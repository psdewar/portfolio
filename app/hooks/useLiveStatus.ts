"use client";

import { useEffect, useState } from "react";

export interface LiveStatus {
  online: boolean;
  viewerCount: number;
  title?: string;
  lastConnectTime?: string;
  lastDisconnectTime?: string;
}

interface Snapshot {
  status: LiveStatus;
  connected: boolean;
}

const OWNCAST_URL = process.env.NEXT_PUBLIC_OWNCAST_URL ?? "";
const LOCAL_OWNCAST = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(OWNCAST_URL);
const RIFF_URL =
  process.env.NEXT_PUBLIC_RIFF_URL || (LOCAL_OWNCAST ? null : "https://live.peytspencer.com/riff");
const POLL_MS = 5000;

let current: LiveStatus = { online: false, viewerCount: 0 };
let connected = false;
let received = false;
const listeners = new Set<(snapshot: Snapshot) => void>();
let source: EventSource | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let attempts = 0;

function notify() {
  const snapshot: Snapshot = { status: current, connected };
  listeners.forEach((listener) => listener(snapshot));
}

function connectSse() {
  source = new EventSource(`${RIFF_URL!}/stream`);

  source.onopen = () => {
    attempts = 0;
    connected = true;
    notify();
  };

  source.onmessage = (event) => {
    current = { ...current, ...(JSON.parse(event.data) as LiveStatus) };
    received = true;
    notify();
  };

  source.onerror = () => {
    source?.close();
    source = null;
    connected = false;
    notify();
    reconnectTimer = setTimeout(connectSse, Math.min(3000 * 2 ** attempts, 30000));
    attempts += 1;
  };
}

function poll() {
  fetch("/api/live/status", { cache: "no-store" })
    .then((res) => res.json())
    .then((data: LiveStatus) => {
      current = { ...current, ...data };
      received = true;
      connected = true;
      notify();
    })
    .catch(() => {
      connected = false;
      notify();
    });
}

function connect() {
  if (RIFF_URL) {
    connectSse();
    return;
  }
  poll();
  pollTimer = setInterval(poll, POLL_MS);
}

function subscribe(listener: (snapshot: Snapshot) => void) {
  listeners.add(listener);
  if (listeners.size === 1 && !source && !pollTimer) connect();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      source?.close();
      source = null;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      if (pollTimer) clearInterval(pollTimer);
      pollTimer = null;
    }
  };
}

export function seedLiveStatus(status: LiveStatus) {
  if (!received) current = status;
}

export function useLiveStatus({
  enabled = true,
  initial,
}: { enabled?: boolean; initial?: LiveStatus } = {}) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => {
    if (initial) seedLiveStatus(initial);
    return { status: current, connected };
  });

  useEffect(() => {
    if (!enabled) return;
    setSnapshot({ status: current, connected });
    return subscribe(setSnapshot);
  }, [enabled]);

  return { ...snapshot.status, connected: snapshot.connected };
}
