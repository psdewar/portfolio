import { useState, useEffect, useCallback } from "react";

const EVENT = "sessionchange";

export interface Session {
  name: string;
  email: string;
}

export function notifySessionChange(): void {
  window.dispatchEvent(new Event(EVENT));
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    fetch("/api/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setSession(data))
      .catch(() => setSession(null))
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, [refresh]);

  return { session, loaded, refresh };
}
