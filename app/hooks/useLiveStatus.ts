"use client";

import { useEffect, useState } from "react";
import type { StreamPath } from "../lib/live";
import {
  type LiveStatusValue,
  type Snapshot,
  getLiveStatusSnapshot,
  seedLiveStatus,
  subscribeLiveStatus,
} from "../lib/live-status";

export type LiveStatus = LiveStatusValue;

export function useLiveStatus({
  enabled = true,
  initial,
  path = "live",
}: { enabled?: boolean; initial?: LiveStatus; path?: StreamPath } = {}) {
  const [snapshot, setSnapshot] = useState<Snapshot>(() => {
    if (initial) seedLiveStatus(initial, path);
    return getLiveStatusSnapshot(path);
  });

  useEffect(() => {
    if (!enabled) return;
    setSnapshot(getLiveStatusSnapshot(path));
    return subscribeLiveStatus(path, setSnapshot);
  }, [enabled, path]);

  return { ...snapshot.status, connected: snapshot.connected };
}
