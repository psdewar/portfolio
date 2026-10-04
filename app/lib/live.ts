import type { LiveStatusValue } from "./live-status";
import { chorusFetch } from "./chorus";

export type StreamPath = "live" | "rehearsal";

export function isStreamPath(value: string): value is StreamPath {
  return value === "live" || value === "rehearsal";
}

export const ADLIB_URL = process.env.NEXT_PUBLIC_ADLIB_URL || "http://localhost:8787";
const OFFLINE: LiveStatusValue = { live: false, since: null, endedAt: null };

async function getRoomStatus(path: StreamPath): Promise<LiveStatusValue> {
  const res = await fetch(`${ADLIB_URL}/adlib/health?room=${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(2000),
  }).catch(() => null);
  if (!res?.ok) return OFFLINE;
  const data = await res.json();
  return {
    live: !!data.live,
    since: typeof data.since === "number" ? data.since : null,
    endedAt: typeof data.ended_at === "number" ? data.ended_at : null,
  };
}

export async function getStreamStatus(path: StreamPath = "live"): Promise<LiveStatusValue> {
  return getRoomStatus(path);
}

export async function getNextStream(): Promise<string | null> {
  const res = await chorusFetch("schedule", {
    cache: "no-store",
    signal: AbortSignal.timeout(2000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json();
  const next = typeof data.nextStream === "string" ? data.nextStream : null;
  return next && new Date(next).getTime() > Date.now() ? next : null;
}
