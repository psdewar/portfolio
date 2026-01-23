"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface DevToolsState {
  simulateSlowNetwork: boolean;
  useLocalAudio: boolean;
  slowNetworkDelay: number; // milliseconds
  enableIngConversion: boolean; // Lyrics sync: convert -ing to -in'
  simulatePatron: boolean; // Simulate logged-in patron state
}

interface DevToolsContextType extends DevToolsState {
  setSimulateSlowNetwork: (value: boolean) => void;
  setUseLocalAudio: (value: boolean) => void;
  setSlowNetworkDelay: (value: number) => void;
  setEnableIngConversion: (value: boolean) => void;
  setSimulatePatron: (value: boolean) => void;
  isDevMode: boolean;
  // Helper to simulate network delay - returns a promise that resolves after the configured delay
  simulateDelay: () => Promise<void>;
  // Helper to get delay-aware minimum loading time
  getMinLoadingTime: () => number;
}

const DevToolsContext = createContext<DevToolsContextType | null>(null);

const STORAGE_KEY = "dev-tools-state";

const DEFAULT_STATE: DevToolsState = {
  simulateSlowNetwork: true,
  useLocalAudio: true,
  slowNetworkDelay: 5000,
  enableIngConversion: true,
  simulatePatron: false,
};

// Helper to read dev tools state synchronously (for use outside React)
export function getDevToolsState(): DevToolsState & { isDevMode: boolean } {
  const isDevMode = process.env.NODE_ENV === "development";
  if (!isDevMode || typeof window === "undefined") {
    return {
      ...DEFAULT_STATE,
      simulateSlowNetwork: false,
      useLocalAudio: false,
      slowNetworkDelay: 0,
      enableIngConversion: false,
      simulatePatron: false,
      isDevMode: false,
    };
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      // Merge with defaults so new flags aren't lost
      return { ...DEFAULT_STATE, ...JSON.parse(saved), isDevMode: true };
    }
  } catch {}
  return { ...DEFAULT_STATE, isDevMode: true };
}

// Utility function to delay - can be used anywhere
export async function devDelay(): Promise<void> {
  const { simulateSlowNetwork, slowNetworkDelay, isDevMode } = getDevToolsState();
  if (isDevMode && simulateSlowNetwork && slowNetworkDelay > 0) {
    await new Promise((resolve) => setTimeout(resolve, slowNetworkDelay));
  }
}

// Hook to simulate slow page load - returns true while "loading"
export function useSimulatedLoading(enabled = true): boolean {
  // Initialize to false to avoid hydration mismatch (localStorage not available on server)
  const [isSimulatingLoad, setIsSimulatingLoad] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const state = getDevToolsState();
    if (!state.isDevMode || !state.simulateSlowNetwork) {
      return;
    }

    // Start simulating, then end after delay
    setIsSimulatingLoad(true);
    const timer = setTimeout(() => {
      setIsSimulatingLoad(false);
    }, state.slowNetworkDelay);

    return () => clearTimeout(timer);
  }, [enabled]);

  return isSimulatingLoad;
}

export function useDevTools() {
  const context = useContext(DevToolsContext);
  if (!context) {
    // Return default values if used outside provider (production)
    return {
      ...DEFAULT_STATE,
      simulateSlowNetwork: false,
      useLocalAudio: false,
      slowNetworkDelay: 0,
      enableIngConversion: false,
      simulatePatron: false,
      setSimulateSlowNetwork: () => {},
      setUseLocalAudio: () => {},
      setSlowNetworkDelay: () => {},
      setEnableIngConversion: () => {},
      setSimulatePatron: () => {},
      isDevMode: false,
      simulateDelay: async () => {},
      getMinLoadingTime: () => 0,
    };
  }
  return context;
}

export function DevToolsProvider({ children }: { children: ReactNode }) {
  const isDevMode = process.env.NODE_ENV === "development";

  // Lazy initialize from localStorage
  const [state, setState] = useState<DevToolsState>(() => {
    if (typeof window === "undefined" || !isDevMode) return DEFAULT_STATE;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_STATE, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_STATE;
  });

  // Save to localStorage on change
  useEffect(() => {
    if (!isDevMode) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, isDevMode]);

  const setSimulateSlowNetwork = (value: boolean) => {
    setState((prev) => ({ ...prev, simulateSlowNetwork: value }));
  };

  const setUseLocalAudio = (value: boolean) => {
    setState((prev) => ({ ...prev, useLocalAudio: value }));
  };

  const setSlowNetworkDelay = (value: number) => {
    setState((prev) => ({ ...prev, slowNetworkDelay: value }));
  };

  const setEnableIngConversion = (value: boolean) => {
    setState((prev) => ({ ...prev, enableIngConversion: value }));
  };

  const setSimulatePatron = (value: boolean) => {
    setState((prev) => ({
      ...prev,
      simulatePatron: value,
      // Auto-disable local audio when patron is on (need real VPS audio)
      useLocalAudio: value ? false : prev.useLocalAudio,
    }));
    // Also set/clear the cookie and localStorage for API auth
    if (value) {
      document.cookie = "patronToken=active; path=/; max-age=31536000";
      localStorage.setItem("patronStatus", "active");
    } else {
      document.cookie = "patronToken=; path=/; max-age=0";
      localStorage.removeItem("patronStatus");
    }
  };

  // Helper to simulate network delay
  const simulateDelay = useCallback(async () => {
    if (isDevMode && state.simulateSlowNetwork && state.slowNetworkDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, state.slowNetworkDelay));
    }
  }, [isDevMode, state.simulateSlowNetwork, state.slowNetworkDelay]);

  // Helper to get minimum loading time (for use with Promise.all patterns)
  const getMinLoadingTime = useCallback(() => {
    if (isDevMode && state.simulateSlowNetwork) {
      return state.slowNetworkDelay;
    }
    return 0;
  }, [isDevMode, state.simulateSlowNetwork, state.slowNetworkDelay]);

  return (
    <DevToolsContext.Provider
      value={{
        ...state,
        setSimulateSlowNetwork,
        setUseLocalAudio,
        setSlowNetworkDelay,
        setEnableIngConversion,
        setSimulatePatron,
        isDevMode,
        simulateDelay,
        getMinLoadingTime,
      }}
    >
      {children}
    </DevToolsContext.Provider>
  );
}
