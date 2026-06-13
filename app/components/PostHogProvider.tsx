"use client";

import posthog from "posthog-js";
import type { CaptureResult } from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

function isFramelessException(event: CaptureResult): boolean {
  const list = event.properties?.$exception_list as
    | Array<{ stacktrace?: { frames?: unknown[] } }>
    | undefined;
  return (list?.[0]?.stacktrace?.frames?.length ?? 0) === 0;
}

function dropFramelessExceptions(
  event: CaptureResult | null,
): CaptureResult | null {
  if (event?.event === "$exception" && isFramelessException(event)) {
    return null;
  }
  return event;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: "/ingest",
      ui_host: "https://us.posthog.com",
      defaults: "2025-05-24",
      capture_exceptions: true,
      error_tracking: { captureExtensionExceptions: false },
      before_send: dropFramelessExceptions,
      debug: process.env.NODE_ENV === "development",
    });
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
