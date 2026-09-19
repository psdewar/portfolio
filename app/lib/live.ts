export interface StreamStatus {
  online: boolean;
  viewerCount: number;
  title?: string;
  lastConnectTime?: string;
  lastDisconnectTime?: string;
}

const OWNCAST_URL = process.env.NEXT_PUBLIC_OWNCAST_URL;
const SCHEDULE_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";
const OFFLINE: StreamStatus = { online: false, viewerCount: 0 };

export async function getStreamStatus(): Promise<StreamStatus> {
  if (!OWNCAST_URL) return OFFLINE;
  const res = await fetch(`${OWNCAST_URL}/api/status`, {
    cache: "no-store",
    signal: AbortSignal.timeout(2000),
  }).catch(() => null);
  if (!res?.ok) return OFFLINE;
  const data = await res.json();
  return {
    online: !!data.online,
    viewerCount: data.viewerCount ?? 0,
    title: data.streamTitle || undefined,
    lastConnectTime: data.lastConnectTime || undefined,
    lastDisconnectTime: data.lastDisconnectTime || undefined,
  };
}

export async function getNextStream(): Promise<string | null> {
  const res = await fetch(`${SCHEDULE_API}/chorus/schedule`, {
    cache: "no-store",
    signal: AbortSignal.timeout(2000),
  }).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json();
  const next = typeof data.nextStream === "string" ? data.nextStream : null;
  return next && new Date(next).getTime() > Date.now() ? next : null;
}
