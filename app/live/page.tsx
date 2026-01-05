"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import Image from "next/image";
import Hls from "hls.js";
import StayConnected from "../components/StayConnected";
import LiveChat from "../components/LiveChat";

const OWNCAST_URL = process.env.NEXT_PUBLIC_OWNCAST_URL;

interface StreamStatus {
  online: boolean;
  viewerCount: number;
  title?: string;
  lastConnectTime?: string;
}

export default function LivePage() {
  const searchParams = useSearchParams();
  const posthog = usePostHog();
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const viewStartTime = useRef<number>(Date.now());
  const [isDesktop, setIsDesktop] = useState(false);
  const [status, setStatus] = useState<StreamStatus>({
    online: false,
    viewerCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [tipAmount, setTipAmount] = useState("10");
  const [isTipping, setIsTipping] = useState(false);
  const [showThanks, setShowThanks] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [showTipPanel, setShowTipPanel] = useState(false);
  const [showNotifyPanel, setShowNotifyPanel] = useState(false);
  const [commenterName, setCommenterName] = useState<string | null>(null);
  const [mockNameInput, setMockNameInput] = useState("");
  const [elapsedTime, setElapsedTime] = useState("");
  const [needsPlayButton, setNeedsPlayButton] = useState(true);

  // Track stream view duration on unmount
  useEffect(() => {
    const isReturnVisitor = localStorage.getItem("livePageVisited") === "true";
    localStorage.setItem("livePageVisited", "true");
    const startTime = viewStartTime.current;

    return () => {
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      posthog?.capture("stream_viewed", {
        duration_seconds: durationSeconds,
        is_return_visitor: isReturnVisitor,
        stream_online: status.online,
      });
    };
  }, [posthog, status.online]);

  // Check for signed-up commenter name
  useEffect(() => {
    const storedName = localStorage.getItem("liveCommenterName");
    setCommenterName(storedName);
  }, [showNotifyPanel]);

  // Check if localhost
  useEffect(() => {
    const hostname = window.location.hostname;
    const isLocal =
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname);
    setIsLocalhost(isLocal);
  }, []);

  // Handle mock name for localhost testing
  const handleSetMockName = () => {
    if (mockNameInput.trim()) {
      localStorage.setItem("liveCommenterName", mockNameInput.trim());
      setCommenterName(mockNameInput.trim());
      setMockNameInput("");
    }
  };

  useEffect(() => {
    if (searchParams.get("thanks") === "1") {
      setShowThanks(true);
      posthog?.capture("tip_completed", { source: "live" });
      window.history.replaceState({}, "", "/live");
      const timer = setTimeout(() => setShowThanks(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, posthog]);

  useEffect(() => {
    async function checkStatus() {
      try {
        const res = await fetch("/api/live/status");
        const data = await res.json();
        setStatus({
          online: data.online,
          viewerCount: data.viewerCount || 0,
          title: data.streamTitle,
          lastConnectTime: data.lastConnectTime,
        });
      } catch {
        setStatus({ online: false, viewerCount: 0 });
      } finally {
        setIsLoading(false);
      }
    }
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  // Update elapsed time every second
  useEffect(() => {
    if (!status.online || !status.lastConnectTime) {
      setElapsedTime("");
      return;
    }

    const updateElapsed = () => {
      const start = new Date(status.lastConnectTime!).getTime();
      const now = Date.now();
      const diff = Math.floor((now - start) / 1000);

      const hours = Math.floor(diff / 3600);
      const mins = Math.floor((diff % 3600) / 60);
      const secs = diff % 60;

      if (hours > 0) {
        setElapsedTime(
          `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`,
        );
      } else {
        setElapsedTime(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [status.online, status.lastConnectTime]);

  // Detect desktop layout
  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Attach HLS to the visible video element
  useEffect(() => {
    if (!status.online) return;

    const video = isDesktop ? desktopVideoRef.current : mobileVideoRef.current;
    if (!video) return;

    const src = `${OWNCAST_URL}/hls/stream.m3u8`;

    const tryAutoplay = (hls?: Hls) => {
      video.muted = true;
      video
        .play()
        .then(() => {
          setNeedsPlayButton(false);
          if (hls?.liveSyncPosition) {
            video.currentTime = hls.liveSyncPosition;
          }
        })
        .catch(() => {
          setNeedsPlayButton(true);
        });
    };

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => tryAutoplay(hls));
      hlsRef.current = hls;
      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else {
      // Native HLS (Safari)
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.addEventListener("loadedmetadata", () => tryAutoplay(), {
          once: true,
        });
      }
    }
  }, [status.online, isDesktop]);

  // Manual play handler - seeks to live edge with sound
  const handleManualPlay = () => {
    const video = isDesktop ? desktopVideoRef.current : mobileVideoRef.current;
    if (!video) return;
    video.muted = false; // User tapped, so we can unmute
    video
      .play()
      .then(() => {
        setNeedsPlayButton(false);
        // Seek to live edge
        if (hlsRef.current?.liveSyncPosition) {
          video.currentTime = hlsRef.current.liveSyncPosition;
        } else if (video.duration) {
          video.currentTime = video.duration;
        }
      })
      .catch(() => {});
  };

  const handleTipWithAmount = async (amount: number) => {
    if (amount < 1) {
      alert("Minimum tip is $1");
      return;
    }
    setIsTipping(true);
    try {
      const res = await fetch("/api/fund-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectTitle: "Live Stream Support",
          projectId: "live-stream",
          amount: Math.round(amount * 100),
        }),
      });
      const { url, error } = await res.json();
      if (error || !url) throw new Error(error || "Failed to create checkout");
      if (!url.startsWith("https://checkout.stripe.com/"))
        throw new Error("Invalid URL");
      window.location.href = url;
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setIsTipping(false);
    }
  };

  const handleTip = async () => {
    const amount = parseFloat(tipAmount);
    if (isNaN(amount) || amount < 1) {
      alert("Minimum tip is $1");
      return;
    }
    handleTipWithAmount(amount);
  };

  const closePanels = () => {
    setShowTipPanel(false);
    setShowNotifyPanel(false);
  };

  // Shared video overlay content
  const renderVideoOverlay = (isMobile: boolean) => (
    <>
      {/* Top bar */}
      <div
        className={`absolute top-0 inset-x-0 z-10 ${isMobile ? "p-3" : "p-4"}`}
      >
        {/* Slide-in tip panel from left - mobile only */}
        {isMobile && showTipPanel && (
          <div
            className="absolute top-0 left-0 right-20 h-auto backdrop-blur z-20"
            style={{ animation: "slideInLeft 0.2s ease-out" }}
          >
            <div className="p-5 bg-gradient-to-br from-white/95 to-neutral-100/95 dark:from-neutral-900/95 dark:to-neutral-800/95 rounded-br-2xl">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-medium text-neutral-900 dark:text-white">
                  Support my independence
                </h2>
                <button
                  onClick={closePanels}
                  className="text-neutral-400 hover:text-neutral-900 dark:text-neutral-500 dark:hover:text-white transition-colors p-1"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {[10, 25, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => handleTipWithAmount(amt)}
                    disabled={isTipping}
                    className="py-3 rounded-xl text-lg font-semibold bg-neutral-200 hover:bg-neutral-300 dark:bg-white/10 dark:hover:bg-white/20 disabled:opacity-50 transition-all text-neutral-700 dark:text-white border border-neutral-300 dark:border-white/10 hover:border-neutral-400 dark:hover:border-white/20"
                  >
                    ${amt}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-neutral-500 text-sm">
                    $
                  </span>
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    min="1"
                    placeholder="10"
                    className="w-full bg-neutral-100 dark:bg-white/5 border border-neutral-300 dark:border-white/10 rounded-xl py-2.5 pl-7 pr-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:border-emerald-500 dark:focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500 dark:focus:ring-emerald-500/50 transition-all"
                  />
                </div>
                <button
                  onClick={handleTip}
                  disabled={isTipping || !tipAmount}
                  className="px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 disabled:hover:from-emerald-500 disabled:hover:to-emerald-600 font-semibold rounded-xl text-sm text-white transition-all shadow-lg shadow-emerald-500/20"
                >
                  {isTipping ? "..." : "Tip"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start justify-between">
          {/* Elapsed time - top left */}
          {elapsedTime && (
            <div className="bg-black/40 px-2.5 py-1 rounded-full text-sm text-white tabular-nums">
              {elapsedTime}
            </div>
          )}
          {!elapsedTime && <div />}
          <div className="flex flex-col items-end gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-red-500 text-white">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                LIVE
              </div>
              <div className="bg-black/40 px-2.5 py-1 rounded-full text-sm flex items-center gap-1.5 text-white">
                <svg
                  className="w-4 h-4"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                  <path
                    fillRule="evenodd"
                    d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {status.viewerCount}
              </div>
            </div>
            {/* Action icons - mobile only */}
            {isMobile && (
              <div className="flex flex-col gap-4">
                <button
                  onClick={() => {
                    setShowNotifyPanel(false);
                    setShowTipPanel(!showTipPanel);
                  }}
                >
                  <svg
                    className={`w-8 h-8 drop-shadow-lg ${
                      showTipPanel ? "text-green-400" : "text-white"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setShowTipPanel(false);
                    setShowNotifyPanel(!showNotifyPanel);
                  }}
                >
                  <svg
                    className={`w-8 h-8 drop-shadow-lg ${
                      showNotifyPanel ? "text-blue-400" : "text-white"
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                    />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom play button - shows only if autoplay blocked */}
      {needsPlayButton && (
        <button
          onClick={handleManualPlay}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/30"
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
            <svg
              className="w-10 h-10 text-white ml-1"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </button>
      )}
    </>
  );

  // Localhost mock name input
  const renderLocalhostNameInput = () => {
    if (!isLocalhost || commenterName) return null;
    return (
      <div className="p-3 bg-yellow-500/10 border-b border-yellow-500/20">
        <p className="text-yellow-600 dark:text-yellow-500 text-xs mb-2">
          Localhost: Enter a name to test
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSetMockName();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={mockNameInput}
            onChange={(e) => setMockNameInput(e.target.value)}
            placeholder="Your name"
            className="flex-1 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm px-3 py-1.5 rounded focus:outline-none"
          />
          <button
            type="submit"
            disabled={!mockNameInput.trim()}
            className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-sm px-3 py-1.5 rounded font-medium"
          >
            Set
          </button>
        </form>
      </div>
    );
  };

  return (
    <div className="fixed top-14 left-0 right-0 bottom-0 bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white overflow-hidden">
      {/* Thank You Toast */}
      {showThanks && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-green-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
          Thank you for supporting!
        </div>
      )}

      {/* Notify Panel Modal */}
      {showNotifyPanel && (
        <div
          className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNotifyPanel(false)}
        >
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <StayConnected
              isModal={true}
              shouldShow={true}
              onClose={() => setShowNotifyPanel(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:flex absolute inset-4 items-center justify-center z-[2]">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex h-full">
            {/* Vertical Video Container */}
            <div className="relative h-full aspect-[9/16] rounded-l-2xl overflow-hidden bg-black">
              {status.online ? (
                <>
                  <video
                    ref={desktopVideoRef}
                    className="absolute inset-0 w-full h-full object-contain bg-neutral-900"
                    playsInline
                  />
                  <div className="absolute inset-0 z-[5]" />
                  {renderVideoOverlay(false)}
                </>
              ) : (
                /* Offline: Show new-era-6 image with I AM OFFLINE + Get notified */
                <>
                  <Image
                    src="/images/home/new-era-6.jpg"
                    alt="Peyt Spencer"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/40" />
                  <div className="absolute top-8 inset-x-0 flex flex-col items-center z-10">
                    <h1 className="font-[family-name:var(--font-bebas)] text-5xl tracking-wide text-white text-center">
                      I AM OFFLINE
                    </h1>
                    <button
                      onClick={() => setShowNotifyPanel(true)}
                      className={`mt-4 px-6 py-3 bg-blue-500/90 hover:bg-blue-400/90 rounded-full text-white font-medium transition-colors ${!showNotifyPanel ? "animate-pulse" : ""}`}
                    >
                      Get notified when I go live
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Sidebar */}
            <div className="w-80 h-full bg-neutral-100 dark:bg-neutral-900 rounded-r-2xl flex flex-col overflow-hidden">
              {/* Tip Section - always visible */}
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                <div className="mb-3">
                  <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">
                    Support my independence
                  </h3>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mb-3">
                  {[10, 25, 50, 100].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handleTipWithAmount(amt)}
                      disabled={isTipping}
                      className="py-2.5 rounded-lg text-lg font-semibold bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 disabled:opacity-50 transition-all text-neutral-700 dark:text-white border border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600"
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      value={tipAmount}
                      onChange={(e) => setTipAmount(e.target.value)}
                      min="1"
                      placeholder="10"
                      className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-lg py-2 pl-7 pr-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleTip}
                    disabled={isTipping || !tipAmount}
                    className="px-5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-50 font-semibold rounded-lg text-sm text-white transition-all shadow-md shadow-emerald-500/20"
                  >
                    {isTipping ? "..." : "Tip"}
                  </button>
                </div>
              </div>

              {/* Chat - always visible, gated when offline */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {isLocalhost && !commenterName && renderLocalhostNameInput()}
                <LiveChat
                  commenterName={status.online ? commenterName : null}
                  onRequestSignIn={() => setShowNotifyPanel(true)}
                  isFloating={false}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Layout */}
      <div className="lg:hidden absolute inset-0 bg-black z-[2]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="relative h-full w-full flex items-center justify-center">
            {/* 9:16 video container - keeps UI within video content area */}
            <div className="relative h-full max-h-full max-w-full aspect-[9/16] z-[3] bg-black">
              {status.online ? (
                <>
                  <video
                    ref={mobileVideoRef}
                    className="absolute inset-0 w-full h-full object-cover bg-neutral-900"
                    playsInline
                  />
                  <div className="absolute inset-x-0 top-0 h-1/2 z-[5]" />
                  {renderVideoOverlay(true)}
                </>
              ) : (
                /* Offline: Show new-era-6 image with STAY TUNED overlay */
                <>
                  <Image
                    src="/images/home/new-era-6.jpg"
                    alt="Peyt Spencer"
                    fill
                    className="object-cover"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/40" />
                  <div className="absolute top-8 inset-x-0 flex flex-col items-center z-10 px-4">
                    <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white text-center">
                      I AM OFFLINE
                    </h1>
                    <button
                      onClick={() => setShowNotifyPanel(true)}
                      className={`mt-4 px-5 py-2.5 bg-blue-500/90 hover:bg-blue-400/90 rounded-full text-white font-medium transition-colors ${!showNotifyPanel ? "animate-pulse" : ""}`}
                    >
                      Get notified when I go live
                    </button>
                  </div>
                </>
              )}
              {/* Localhost mock name input - floating */}
              {isLocalhost && !commenterName && status.online && (
                <div className="absolute top-16 left-3 right-3 z-30">
                  <div className="bg-yellow-500/20 backdrop-blur rounded-xl p-3">
                    <p className="text-yellow-500 text-xs mb-2">
                      Localhost: Enter a name to test
                    </p>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleSetMockName();
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        value={mockNameInput}
                        onChange={(e) => setMockNameInput(e.target.value)}
                        placeholder="Your name"
                        className="flex-1 bg-black/50 text-white text-sm px-3 py-1.5 rounded-lg focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!mockNameInput.trim()}
                        className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-sm px-3 py-1.5 rounded-lg font-medium"
                      >
                        Set
                      </button>
                    </form>
                  </div>
                </div>
              )}
              {/* Floating Chat - always visible, gated when offline */}
              <LiveChat
                commenterName={status.online ? commenterName : null}
                onRequestSignIn={() => setShowNotifyPanel(true)}
                isFloating={true}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
