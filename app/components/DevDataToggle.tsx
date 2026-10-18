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

export function useDataMode() {
  const [active, setActive] = useState<DataMode>("demo");

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
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

  return { active, choose };
}

export default function DevDataToggle({
  active,
  choose,
}: {
  active: DataMode;
  choose: (mode: DataMode) => void;
}) {
  return (
    <div role="group" aria-label="Data mode" className="flex w-full bg-gray-800 rounded-lg p-0.5">
      {OPTIONS.map(({ mode, label }) => (
        <button
          key={mode}
          type="button"
          onClick={() => choose(mode)}
          aria-pressed={active === mode}
          className={`flex-1 min-w-0 rounded-md text-xs py-1.5 transition-colors ${
            active === mode ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
