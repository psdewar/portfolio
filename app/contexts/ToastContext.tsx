"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Toast } from "../components/Toast";

type ToastContextType = {
  show: (message: string, durationMs?: number) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [exiting, setExiting] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const show = useCallback((msg: string, durationMs = 3000) => {
    timersRef.current.forEach(clearTimeout);
    setMessage(msg);
    setExiting(false);
    timersRef.current = [
      setTimeout(() => setExiting(true), Math.max(0, durationMs - 500)),
      setTimeout(() => {
        setMessage(null);
        setExiting(false);
      }, durationMs),
    ];
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message && <Toast message={message} exiting={exiting} />}
    </ToastContext.Provider>
  );
}
