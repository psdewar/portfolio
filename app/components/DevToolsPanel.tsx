"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDevTools } from "../contexts/DevToolsContext";

export function DevToolsPanel() {
  const {
    isDevMode,
    simulateSlowNetwork,
    useLocalAudio,
    slowNetworkDelay,
    enableIngConversion,
    simulatePatron,
    setSimulateSlowNetwork,
    setUseLocalAudio,
    setSlowNetworkDelay,
    setEnableIngConversion,
    setSimulatePatron,
  } = useDevTools();

  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const navigateTo = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };

  // Only render in development
  if (!isDevMode) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-24 right-4 z-[100] w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen
            ? "bg-red-500 hover:bg-red-600"
            : simulateSlowNetwork || useLocalAudio
            ? "bg-yellow-500 hover:bg-yellow-600"
            : "bg-gray-800 hover:bg-gray-700"
        }`}
        title="Dev Tools"
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

      {/* Panel */}
      {isOpen && (
        <div className="fixed bottom-40 right-4 z-[100] w-80 bg-gray-900 text-white rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-lg">🛠 Dev Tools</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
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

          <div className="p-4 space-y-4">
            {/* Simulate Slow Network */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">🐢 Simulate Slow Network</span>
                <button
                  onClick={() => setSimulateSlowNetwork(!simulateSlowNetwork)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    simulateSlowNetwork ? "bg-yellow-500" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      simulateSlowNetwork ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </label>
              {simulateSlowNetwork && (
                <div className="pl-4">
                  <label className="text-xs text-gray-400">Delay: {slowNetworkDelay}ms</label>
                  <input
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
            </div>

            {/* Use Local Audio */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">💾 Use Local Audio</span>
                <button
                  onClick={() => {
                    setUseLocalAudio(!useLocalAudio);
                    // Note: requires page refresh to take effect due to cached blob URLs
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    useLocalAudio ? "bg-green-500" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      useLocalAudio ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </label>
              <p className="text-xs text-gray-400 pl-4">
                {useLocalAudio
                  ? "Using mock audio (saves Vercel Blob egress)"
                  : "Using Vercel Blob audio (costs egress)"}
              </p>
            </div>

            {/* ING Conversion (Lyrics Sync) */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">🎤 -ing → -in'</span>
                <button
                  onClick={() => setEnableIngConversion(!enableIngConversion)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    enableIngConversion ? "bg-purple-500" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      enableIngConversion ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </label>
              <p className="text-xs text-gray-400 pl-4">
                Lyrics sync: convert -ing to -in' (hip-hop style)
              </p>
            </div>

            {/* Simulate Patron */}
            <div className="space-y-2">
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium">👑 Simulate Patron</span>
                <button
                  onClick={() => setSimulatePatron(!simulatePatron)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${
                    simulatePatron ? "bg-orange-500" : "bg-gray-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                      simulatePatron ? "translate-x-5" : ""
                    }`}
                  />
                </button>
              </label>
              <p className="text-xs text-gray-400 pl-4">
                View patron experience on /patron page
              </p>
            </div>

            <button
              onClick={() => {
                if (!simulatePatron) setSimulatePatron(true);
                navigateTo("/listen?patron_welcome=1");
              }}
              className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Patron Welcome
            </button>

            <button
              onClick={() => navigateTo("/download?session_id=test_123")}
              className="w-full py-2 px-4 bg-pink-600 hover:bg-pink-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Download Page
            </button>

            <button
              onClick={() => window.location.reload()}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Refresh to apply changes
            </button>

            {/* Status indicator */}
            <div className="pt-2 border-t border-gray-700">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Development mode
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
