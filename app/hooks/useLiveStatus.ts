"use client";

import { useState, useEffect } from "react";

interface LiveStatus {
  online: boolean;
  viewerCount: number;
  title?: string;
  lastConnectTime?: string;
}

interface UseLiveStatusOptions {
  enabled?: boolean; // Set to false to close/skip SSE connection
}

const RIFF_URL = process.env.NEXT_PUBLIC_RIFF_URL || "https://live.peytspencer.com/riff";

export function useLiveStatus({ enabled = true }: UseLiveStatusOptions = {}) {
  const [status, setStatus] = useState<LiveStatus>({ online: false, viewerCount: 0 });
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    let eventSource: EventSource | null = null;
    let reconnectTimer: NodeJS.Timeout | null = null;

    const connect = () => {
      eventSource = new EventSource(`${RIFF_URL}/stream`);

      eventSource.onopen = () => {
        setConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as LiveStatus;
          setStatus(data);
          setIsLoading(false);
        } catch (e) {
          console.error("Failed to parse SSE data:", e);
        }
      };

      eventSource.onerror = () => {
        setConnected(false);
        eventSource?.close();
        // Reconnect after 3 seconds
        reconnectTimer = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      eventSource?.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [enabled]);

  return { ...status, connected, isLoading };
}
