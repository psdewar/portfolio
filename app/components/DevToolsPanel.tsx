"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDevTools } from "../contexts/DevToolsContext";
import { isShowUpcoming } from "../lib/shows-shared";
import DevDataToggle, { useDataMode } from "./DevDataToggle";

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-yellow-500";

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-gray-100">{label}</span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={onChange}
          className={`relative w-11 h-6 shrink-0 rounded-full transition-colors ${focusRing} ${
            checked ? "bg-yellow-500" : "bg-gray-600"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
              checked ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function Action({
  children,
  onClick,
  tone,
  className = "w-full",
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "danger";
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${className} py-2 px-3 rounded-md text-sm bg-gray-800 transition-colors text-left ${focusRing} ${
        tone === "danger" ? "text-red-300 hover:bg-red-950" : "text-gray-100 hover:bg-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

export function DevToolsPanel() {
  const [simulatedNow, setSimulatedNow] = useState("");
  const {
    isDevMode,
    simulateSlowNetwork,
    useLocalAudio,
    slowNetworkDelay,
    enableIngConversion,
    simulateSupporter,
    setSimulateSlowNetwork,
    setUseLocalAudio,
    setSlowNetworkDelay,
    setEnableIngConversion,
    setSimulateSupporter,
  } = useDevTools();

  const { active, choose } = useDataMode();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isDevMode || simulatedNow) return;
    fetch("/api/shows")
      .then((r) => r.json())
      .then((shows: { country?: string; date: string; status?: "cancelled" }[]) => {
        if (!Array.isArray(shows)) return;
        const nextCa = shows
          .filter((s) => s.country === "CA" && isShowUpcoming(s))
          .sort((a, b) => a.date.localeCompare(b.date))[0];
        if (nextCa?.date) setSimulatedNow(nextCa.date);
      })
      .catch(() => {});
  }, [isDevMode, simulatedNow]);

  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  const resetCheckin = () => {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("checkin:") || k.startsWith("ticket:"))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem("attendeeEmail");
    } catch {}
    window.location.reload();
  };

  if (!isDevMode) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-24 right-4 z-[100] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen
            ? "bg-red-500 hover:bg-red-600"
            : simulateSlowNetwork || useLocalAudio || active !== "demo"
              ? "bg-yellow-500 hover:bg-yellow-600"
              : "bg-gray-800 hover:bg-gray-700"
        }`}
        title="Dev Tools"
        aria-label="Dev tools"
      >
        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="fixed bottom-40 right-4 z-[100] w-[min(20rem,calc(100vw-2rem))] max-h-[calc(100dvh-11rem)] flex flex-col bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
          <div className="shrink-0 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Dev tools</h3>
            <button
              onClick={() => setIsOpen(false)}
              aria-label="Close dev tools"
              className={`text-gray-400 hover:text-white ${focusRing}`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-5">
            <section>
              <h4 className="text-xs font-medium text-gray-400 mb-2">Data</h4>
              <DevDataToggle active={active} choose={choose} />
            </section>

            <section>
              <h4 className="text-xs font-medium text-gray-400 mb-2">Network and audio</h4>
              <div className="space-y-2">
                <Toggle
                  label="Slow network"
                  checked={simulateSlowNetwork}
                  onChange={() => setSimulateSlowNetwork(!simulateSlowNetwork)}
                />
                {simulateSlowNetwork && (
                  <div>
                    <label htmlFor="dev-slow-delay" className="text-xs text-gray-400">
                      Delay {slowNetworkDelay}ms
                    </label>
                    <input
                      id="dev-slow-delay"
                      type="range"
                      min="500"
                      max="5000"
                      step="500"
                      value={slowNetworkDelay}
                      onChange={(e) => setSlowNetworkDelay(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                )}
                <Toggle
                  label="Local audio"
                  hint={useLocalAudio ? "Mock audio, no Blob egress" : "Blob audio, costs egress"}
                  checked={useLocalAudio}
                  onChange={() => setUseLocalAudio(!useLocalAudio)}
                />
              </div>
            </section>

            <section>
              <h4 className="text-xs font-medium text-gray-400 mb-2">Lyrics</h4>
              <div className="space-y-2">
                <Toggle
                  label="Convert -ing to -in'"
                  checked={enableIngConversion}
                  onChange={() => setEnableIngConversion(!enableIngConversion)}
                />
              </div>
            </section>

            <section>
              <h4 className="text-xs font-medium text-gray-400 mb-2">Supporter</h4>
              <div className="space-y-2">
                <Toggle
                  label="Simulate supporter"
                  hint="Shows supporter view on /support"
                  checked={simulateSupporter}
                  onChange={() => setSimulateSupporter(!simulateSupporter)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Action
                    onClick={() => {
                      if (!simulateSupporter) setSimulateSupporter(true);
                      navigateTo("/listen?supporter_welcome=1");
                    }}
                  >
                    Welcome page
                  </Action>
                  <Action
                    onClick={() => {
                      const to = prompt("Send supporter welcome email to:");
                      if (!to) return;
                      fetch(`/api/test-email?type=supporter-welcome&to=${encodeURIComponent(to)}`);
                    }}
                  >
                    Send welcome email
                  </Action>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-xs font-medium text-gray-400 mb-2">Pages</h4>
              <div className="space-y-2">
                <Action onClick={() => navigateTo("/download?session_id=test_123")}>
                  Download page
                </Action>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={simulatedNow}
                    onChange={(e) => setSimulatedNow(e.target.value)}
                    className="flex-1 min-w-0 px-2 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:border-gray-500"
                  />
                  <Action
                    className="shrink-0 w-auto"
                    onClick={() =>
                      navigateTo(
                        simulatedNow ? `/support?now=${simulatedNow}` : "/support?country=CA"
                      )
                    }
                  >
                    Support (CA)
                  </Action>
                </div>
              </div>
            </section>
          </div>

          <div className="shrink-0 border-t border-gray-700 px-4 py-3 grid grid-cols-2 gap-2">
            <Action tone="danger" onClick={resetCheckin}>
              Reset check-in
            </Action>
            <Action onClick={() => window.location.reload()}>Refresh page</Action>
          </div>
        </div>
      )}
    </>
  );
}
