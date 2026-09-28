"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type AdlibError,
  type AdlibFloatingReaction,
  type AdlibIdentity,
  type AdlibMessage,
  decodeAdlibToken,
} from "../lib/adlib";
import type { LiveStatusValue } from "../lib/live-status";
import type { StreamPath } from "../lib/live";
import {
  sendAdlibWire,
  setAdlibAuthToken,
  setLiveStatusSource,
  subscribeAdlibWire,
} from "../lib/live-status";
import { useLiveStatus } from "./useLiveStatus";

const REACTION_LIFETIME_MS = 2600;
const ERROR_LIFETIME_MS = 4000;

export type AdlibAuthState = "loading" | "signed-in" | "signed-out" | "needs-name";

interface WireHistory {
  type: "history";
  messages: AdlibMessage[];
}
interface WireMessage {
  type: "message";
  message: AdlibMessage;
}
interface WireHide {
  type: "hide";
  id: number;
}
interface WireReact {
  type: "react";
  emoji: string;
}
interface WireError {
  type: "error";
  code: string;
  message: string;
}
interface WireStatus {
  type: "status";
  live: boolean;
  since: number | null;
  ended_at: number | null;
}
type WireEvent = WireHistory | WireMessage | WireHide | WireReact | WireError | WireStatus;

function isWireEvent(data: unknown): data is WireEvent {
  return !!data && typeof data === "object" && typeof (data as { type?: unknown }).type === "string";
}

export interface UseAdlibSocketResult {
  authState: AdlibAuthState;
  identity: AdlibIdentity | null;
  connected: boolean;
  historyLoaded: boolean;
  messages: AdlibMessage[];
  floatingReactions: AdlibFloatingReaction[];
  error: AdlibError | null;
  liveStatus: LiveStatusValue | null;
  send: (text: string) => boolean;
  react: (emoji: string) => void;
  hide: (id: number) => void;
  mute: (sub: string) => void;
  requestSignIn: () => void;
}

export function useAdlibSocket(
  onRequestSignIn: () => void,
  room: StreamPath = "live",
): UseAdlibSocketResult {
  const [authState, setAuthState] = useState<AdlibAuthState>("loading");
  const [token, setToken] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messages, setMessages] = useState<AdlibMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<AdlibFloatingReaction[]>([]);
  const [error, setError] = useState<AdlibError | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { live, since, endedAt, connected } = useLiveStatus({ path: room });
  const liveStatus: LiveStatusValue | null = connected ? { live, since, endedAt } : null;

  useEffect(() => {
    let cancelled = false;

    async function resolveToken() {
      if (process.env.NODE_ENV !== "production") {
        const urlToken = new URLSearchParams(window.location.search).get("adlibToken");
        if (urlToken) {
          if (!cancelled) {
            setToken(urlToken);
            setAuthState("signed-in");
          }
          return;
        }
      }
      try {
        const res = await fetch("/api/adlib/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        if (res.ok && typeof data?.token === "string") {
          setToken(data.token);
          setAuthState("signed-in");
        } else if (res.status === 403 && data?.error === "needs_name") {
          setToken(null);
          setAuthState("needs-name");
        } else {
          setToken(null);
          setAuthState("signed-out");
        }
      } catch {
        if (!cancelled) {
          setToken(null);
          setAuthState("signed-out");
        }
      }
    }

    resolveToken();
    window.addEventListener("sessionchange", resolveToken);
    return () => {
      cancelled = true;
      window.removeEventListener("sessionchange", resolveToken);
    };
  }, []);

  useLayoutEffect(() => {
    setLiveStatusSource("socket", room);
    return () => setLiveStatusSource(null, room);
  }, [room]);

  useEffect(() => {
    if (authState === "loading") return;
    setAdlibAuthToken(token, room);
  }, [authState, token, room]);

  const showError = useCallback((err: AdlibError) => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError(err);
    errorTimerRef.current = setTimeout(() => setError(null), ERROR_LIFETIME_MS);
  }, []);

  useEffect(() => {
    setHistoryLoaded(false);
    setMessages([]);
    return subscribeAdlibWire(room, (data) => {
      if (!isWireEvent(data)) return;
      switch (data.type) {
        case "history":
          setMessages(data.messages ?? []);
          setHistoryLoaded(true);
          break;
        case "message":
          setMessages((prev) => [...prev, data.message]);
          break;
        case "hide":
          setMessages((prev) => prev.filter((m) => m.id !== data.id));
          break;
        case "react": {
          const key = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          setFloatingReactions((prev) => [...prev, { key, emoji: data.emoji }]);
          setTimeout(() => {
            setFloatingReactions((prev) => prev.filter((r) => r.key !== key));
          }, REACTION_LIFETIME_MS);
          break;
        }
        case "error":
          showError({ code: data.code, message: data.message });
          break;
        case "status":
          break;
      }
    });
  }, [room, showError]);

  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const identity = useMemo(() => (token ? decodeAdlibToken(token) : null), [token]);

  const sendWire = useCallback(
    (payload: Record<string, unknown>): boolean => sendAdlibWire(room, payload),
    [room],
  );

  const send = useCallback(
    (text: string): boolean => {
      if (!identity) {
        onRequestSignIn();
        return false;
      }
      return sendWire({ type: "send", text });
    },
    [identity, onRequestSignIn, sendWire],
  );

  const react = useCallback(
    (emoji: string) => {
      if (!identity) {
        onRequestSignIn();
        return;
      }
      sendWire({ type: "react", emoji });
    },
    [identity, onRequestSignIn, sendWire],
  );

  const hide = useCallback((id: number) => sendWire({ type: "hide", id }), [sendWire]);
  const mute = useCallback((sub: string) => sendWire({ type: "mute", sub }), [sendWire]);

  return {
    authState,
    identity,
    connected,
    historyLoaded,
    messages,
    floatingReactions,
    error,
    liveStatus,
    send,
    react,
    hide,
    mute,
    requestSignIn: onRequestSignIn,
  };
}
