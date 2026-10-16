"use client";

import { useEffect, useState } from "react";
import { DATA_COOKIE, isDataMode, type DataMode } from "../lib/dev-data/mode";

const OPTIONS: { mode: DataMode; label: string }[] = [
  { mode: "demo", label: "Demo" },
  { mode: "worst", label: "Worst" },
  { mode: "empty", label: "Empty" },
  { mode: "one", label: "One" },
  { mode: "huge", label: "1,000" },
];

const readCookie = (): DataMode => {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${DATA_COOKIE}=([^;]+)`));
  return isDataMode(match?.[1]) ? match[1] : "demo";
};

const writeCookie = (mode: DataMode) => {
  document.cookie = `${DATA_COOKIE}=${mode}; path=/; SameSite=Lax`;
};

export default function DevDataToggle() {
  const [active, setActive] = useState<DataMode>("demo");

  useEffect(() => {
    const current = readCookie();
    const fromUrl = new URLSearchParams(location.search).get("data");
    if (isDataMode(fromUrl) && fromUrl !== current) {
      writeCookie(fromUrl);
      location.reload();
      return;
    }
    setActive(current);
  }, []);

  const choose = (mode: DataMode) => {
    writeCookie(mode);
    const url = new URL(location.href);
    url.searchParams.set("data", mode);
    history.replaceState(null, "", url);
    location.reload();
  };

  return (
    <div
      role="group"
      aria-label="Data mode"
      style={{
        position: "fixed",
        left: "50%",
        bottom: "calc(var(--player-h, 0px) + 8px)",
        transform: "translateX(-50%)",
        zIndex: 2147483647,
        display: "flex",
        gap: 2,
        padding: 2,
        background: "#d1d5db",
        borderRadius: 8,
        font: "12px/1 system-ui, sans-serif",
        maxWidth: "calc(100vw - 16px)",
      }}
    >
      {OPTIONS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => choose(mode)}
          aria-pressed={active === mode}
          style={{
            padding: "6px 8px",
            border: 0,
            borderRadius: 6,
            font: "inherit",
            whiteSpace: "nowrap",
            cursor: "pointer",
            color: "#111827",
            background: active === mode ? "#fff" : "transparent",
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
