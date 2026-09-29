import { resolveAdlibUrl } from "./adlib";
import type { StreamPath } from "./live";

export interface LiveStatusValue {
  live: boolean;
  since: number | null;
  endedAt: number | null;
}

export interface Snapshot {
  status: LiveStatusValue;
  connected: boolean;
}

const ADLIB_URL = process.env.NEXT_PUBLIC_ADLIB_URL || "ws://localhost:8787";
const POLL_MS = 5000;
const CONFIRM_POLL_MS = 15000;
const MAX_BACKOFF_MS = 15000;
const OFFLINE: LiveStatusValue = { live: false, since: null, endedAt: null };

interface AuthIntent {
  pending: boolean;
  token: string | null;
}

interface PathState {
  current: LiveStatusValue;
  connected: boolean;
  received: boolean;
  listeners: Set<(snapshot: Snapshot) => void>;
  wireListeners: Set<(data: unknown) => void>;
  wireLog: unknown[];
  socket: WebSocket | null;
  socketToken: string | null;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  pollTimer: ReturnType<typeof setInterval> | null;
  confirmTimer: ReturnType<typeof setInterval> | null;
  lastSocketStatusAt: number;
  attempts: number;
  authIntent: AuthIntent | null;
  reconcileScheduled: boolean;
}

const stores = new Map<StreamPath, PathState>();

function getStore(path: StreamPath): PathState {
  let store = stores.get(path);
  if (!store) {
    store = {
      current: OFFLINE,
      connected: false,
      received: false,
      listeners: new Set(),
      wireListeners: new Set(),
      wireLog: [],
      socket: null,
      socketToken: null,
      reconnectTimer: null,
      pollTimer: null,
      confirmTimer: null,
      lastSocketStatusAt: 0,
      attempts: 0,
      authIntent: null,
      reconcileScheduled: false,
    };
    stores.set(path, store);
  }
  return store;
}

function notify(path: StreamPath) {
  const store = getStore(path);
  const snapshot: Snapshot = { status: store.current, connected: store.connected };
  store.listeners.forEach((listener) => listener(snapshot));
}

function parseStatusWire(data: unknown): LiveStatusValue | null {
  if (!data || typeof data !== "object") return null;
  const event = data as { type?: string; live?: boolean; since?: number | null; ended_at?: number | null };
  if (event.type !== "status") return null;
  return {
    live: !!event.live,
    since: typeof event.since === "number" ? event.since : null,
    endedAt: typeof event.ended_at === "number" ? event.ended_at : null,
  };
}

function stopPolling(path: StreamPath) {
  const store = getStore(path);
  if (store.pollTimer) {
    clearInterval(store.pollTimer);
    store.pollTimer = null;
  }
}

function stopConfirmPolling(path: StreamPath) {
  const store = getStore(path);
  if (store.confirmTimer) {
    clearInterval(store.confirmTimer);
    store.confirmTimer = null;
  }
}

function usesSocket(path: StreamPath) {
  return path === "live" || getStore(path).wireListeners.size > 0;
}

function closeSocket(path: StreamPath) {
  const store = getStore(path);
  if (store.reconnectTimer) {
    clearTimeout(store.reconnectTimer);
    store.reconnectTimer = null;
  }
  if (store.socket) {
    const ws = store.socket;
    store.socket = null;
    store.socketToken = null;
    store.connected = false;
    notify(path);
    ws.close();
  }
}

function poll(path: StreamPath) {
  const store = getStore(path);
  const startedAt = Date.now();
  fetch(`/api/live/status?path=${path}`, { cache: "no-store" })
    .then((res) => res.json())
    .then((data: LiveStatusValue) => {
      if (startedAt < store.lastSocketStatusAt) return;
      store.current = data;
      store.received = true;
      if (!usesSocket(path)) store.connected = true;
      notify(path);
      if (usesSocket(path)) syncSocketPolling(path);
    })
    .catch(() => {
      if (usesSocket(path)) return;
      store.connected = false;
      notify(path);
    });
}

function syncSocketPolling(path: StreamPath) {
  const store = getStore(path);
  if (store.listeners.size === 0 && store.wireListeners.size === 0) return;
  if (!store.connected) {
    stopConfirmPolling(path);
    ensurePolling(path);
    return;
  }
  stopPolling(path);
  if (!store.current.live) {
    stopConfirmPolling(path);
    return;
  }
  if (!store.confirmTimer) store.confirmTimer = setInterval(() => poll(path), CONFIRM_POLL_MS);
}

function ensurePolling(path: StreamPath) {
  const store = getStore(path);
  if (store.pollTimer) return;
  poll(path);
  store.pollTimer = setInterval(() => poll(path), POLL_MS);
}

function openSocket(path: StreamPath, token: string | null) {
  const store = getStore(path);
  store.wireLog = [];
  const url = new URL("/adlib/ws", resolveAdlibUrl(ADLIB_URL).replace(/^http/, "ws"));
  url.searchParams.set("room", path);
  if (token) url.searchParams.set("token", token);
  const ws = new WebSocket(url.toString());
  store.socket = ws;
  store.socketToken = token;

  ws.onopen = () => {
    store.attempts = 0;
    store.connected = true;
    notify(path);
    syncSocketPolling(path);
  };

  ws.onmessage = (event) => {
    if (typeof event.data !== "string") return;
    let data: unknown;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }
    const status = parseStatusWire(data);
    if (status) {
      store.current = status;
      store.received = true;
      store.lastSocketStatusAt = Date.now();
      notify(path);
      syncSocketPolling(path);
    }
    store.wireLog.push(data);
    store.wireListeners.forEach((listener) => listener(data));
  };

  ws.onclose = () => {
    if (store.socket !== ws) return;
    store.socket = null;
    store.socketToken = null;
    store.connected = false;
    notify(path);
    if (store.listeners.size === 0 && store.wireListeners.size === 0) return;
    syncSocketPolling(path);
    store.reconnectTimer = setTimeout(() => {
      store.reconnectTimer = null;
      reconcile(path);
    }, Math.min(1000 * 2 ** store.attempts, MAX_BACKOFF_MS));
    store.attempts += 1;
  };

  ws.onerror = () => ws.close();
}

function scheduleReconcile(path: StreamPath) {
  const store = getStore(path);
  if (store.reconcileScheduled) return;
  store.reconcileScheduled = true;
  queueMicrotask(() => {
    store.reconcileScheduled = false;
    reconcile(path);
  });
}

function reconcile(path: StreamPath) {
  const store = getStore(path);
  const wantsRealtime = store.listeners.size > 0 || store.wireListeners.size > 0;

  if (!wantsRealtime) {
    closeSocket(path);
    stopPolling(path);
    stopConfirmPolling(path);
    return;
  }

  if (!usesSocket(path)) {
    closeSocket(path);
    stopConfirmPolling(path);
    ensurePolling(path);
    return;
  }

  if (store.authIntent?.pending) {
    closeSocket(path);
    syncSocketPolling(path);
    return;
  }

  const desiredToken = store.authIntent ? store.authIntent.token : null;
  if (store.socket && store.socketToken === desiredToken) {
    syncSocketPolling(path);
    return;
  }
  closeSocket(path);
  openSocket(path, desiredToken);
  syncSocketPolling(path);
}

function recheckAll() {
  stores.forEach((store, path) => {
    if (store.listeners.size === 0 && store.wireListeners.size === 0) return;
    poll(path);
    if (usesSocket(path) && (!store.socket || store.socket.readyState !== WebSocket.OPEN)) reconcile(path);
  });
}

if (typeof window !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") recheckAll();
  });
  window.addEventListener("online", recheckAll);
}

export function seedLiveStatus(status: LiveStatusValue, path: StreamPath = "live") {
  const store = getStore(path);
  if (!store.received) store.current = status;
}

export function setLiveStatusSource(source: "socket" | null, path: StreamPath = "live") {
  const store = getStore(path);
  store.authIntent = source === "socket" ? { pending: true, token: null } : null;
  scheduleReconcile(path);
}

export function setAdlibAuthToken(token: string | null, path: StreamPath = "live") {
  const store = getStore(path);
  if (!store.authIntent) store.authIntent = { pending: false, token };
  else {
    store.authIntent.pending = false;
    store.authIntent.token = token;
  }
  scheduleReconcile(path);
}

export function subscribeLiveStatus(path: StreamPath, listener: (snapshot: Snapshot) => void) {
  const store = getStore(path);
  store.listeners.add(listener);
  scheduleReconcile(path);
  return () => {
    store.listeners.delete(listener);
    scheduleReconcile(path);
  };
}

export function subscribeAdlibWire(path: StreamPath, listener: (data: unknown) => void) {
  const store = getStore(path);
  store.wireLog.forEach((data) => listener(data));
  store.wireListeners.add(listener);
  scheduleReconcile(path);
  return () => {
    store.wireListeners.delete(listener);
    scheduleReconcile(path);
  };
}

export function sendAdlibWire(path: StreamPath, payload: Record<string, unknown>): boolean {
  const store = getStore(path);
  if (store.socket && store.socket.readyState === WebSocket.OPEN) {
    store.socket.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

export function getLiveStatusSnapshot(path: StreamPath): Snapshot {
  const store = getStore(path);
  return { status: store.current, connected: store.connected };
}
