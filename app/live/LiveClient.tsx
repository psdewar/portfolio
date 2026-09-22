"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { activatePatronStatus } from "../lib/patron";
import Image from "next/image";
import Hls from "hls.js";
import StayConnected from "../components/StayConnected";
import { Toast } from "../components/Toast";
import LiveChat from "../components/LiveChat";
import { useLiveStatus, type LiveStatus } from "../hooks/useLiveStatus";
import { formatNextStream, formatTimeAgo } from "../lib/dates";
import {
  EyeIcon,
  BellIcon,
  SpeakerSlashIcon,
  PlayIcon,
  MapPinIcon,
  CornersOutIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import { formatEventDate, type TimelineEvent } from "../data/timeline";
import { usePatronStatus } from "../hooks/usePatronStatus";

const OWNCAST_URL = process.env.NEXT_PUBLIC_OWNCAST_URL;

export default function LiveClient({
  recentShows,
  initialStatus,
  nextStream,
}: {
  recentShows: TimelineEvent[];
  initialStatus: LiveStatus;
  nextStream: string | null;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const posthog = usePostHog();
  const isPatron = usePatronStatus();
  const isOgMode = searchParams.get("og") === "true";
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const viewStartTime = useRef<number>(Date.now());
  const [isDesktop, setIsDesktop] = useState<boolean | null>(isOgMode ? true : null);

  // Use SSE-based live status (no polling!)
  const liveStatus = useLiveStatus({ initial: initialStatus });
  const status: LiveStatus = liveStatus;
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [showNotifyPanel, setShowNotifyPanel] = useState(false);
  const [commenterName, setCommenterName] = useState<string | null>(null);

  const [mockNameInput, setMockNameInput] = useState("");
  const [elapsedTime, setElapsedTime] = useState("");
  const [needsPlayButton, setNeedsPlayButton] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const thanksHandled = useRef(false);

  useEffect(() => {
    if (!isOgMode) return;
    document.documentElement.classList.add("og-mode");
    return () => document.documentElement.classList.remove("og-mode");
  }, [isOgMode]);

  const onlineRef = useRef(status.online);
  onlineRef.current = status.online;

  useEffect(() => {
    const isReturnVisitor = localStorage.getItem("livePageVisited") === "true";
    localStorage.setItem("livePageVisited", "true");
    const startTime = viewStartTime.current;

    return () => {
      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);
      posthog?.capture("stream_viewed", {
        duration_seconds: durationSeconds,
        is_return_visitor: isReturnVisitor,
        stream_online: onlineRef.current,
      });
    };
  }, [posthog]);

  useEffect(() => {
    const storedName = localStorage.getItem("liveCommenterName");
    setCommenterName(storedName);
  }, [showNotifyPanel]);

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

  const handleSetMockName = () => {
    if (mockNameInput.trim()) {
      localStorage.setItem("liveCommenterName", mockNameInput.trim());
      setCommenterName(mockNameInput.trim());
      setMockNameInput("");
    }
  };

  const showToast = (message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast(message);
    toastTimerRef.current = setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    if (searchParams.get("thanks") !== "1" || thanksHandled.current) return;
    thanksHandled.current = true;
    activatePatronStatus();
    posthog?.capture("patron_checkout_completed", { source: "live" });

    if (!status.online) {
      router.replace("/listen?success=patron_live");
      return;
    }

    showToast("Thank you for supporting.");
    window.history.replaceState({}, "", "/live");
  }, [searchParams, posthog, status.online, router]);

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

  useEffect(() => {
    // OG mode always uses desktop layout for clean screenshots
    if (isOgMode) {
      setIsDesktop(true);
      return;
    }
    // Desktop layout needs sufficient width AND height
    const mediaQuery = window.matchMedia("(min-width: 768px) and (min-height: 500px)");
    setIsDesktop(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [isOgMode]);

  useEffect(() => {
    if (!status.online || isDesktop === null) return;
    const video = videoRef.current;
    if (!video) return;
    const src = `${OWNCAST_URL}/hls/stream.m3u8`;

    const tryAutoplay = (hls?: Hls) => {
      video.muted = true;
      setIsMuted(true);
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

    let disposed = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    if (Hls.isSupported()) {
      const hls = new Hls({ lowLatencyMode: true, enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => tryAutoplay(hls));
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          retry = setTimeout(() => {
            if (!disposed) hls.startLoad();
          }, 3000);
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          hls.destroy();
          setNeedsPlayButton(true);
        }
      });
      hlsRef.current = hls;
      return () => {
        disposed = true;
        if (retry) clearTimeout(retry);
        hls.destroy();
        hlsRef.current = null;
      };
    }
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => tryAutoplay(), { once: true });
      return () => {
        video.removeAttribute("src");
        video.load();
      };
    }
  }, [status.online, isDesktop]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!status.online) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: status.title || "Live",
      artist: "Peyt Spencer",
      artwork: [{ src: "https://peytspencer.com/images/home/new-era-6.jpg", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", () => videoRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => videoRef.current?.pause());
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
    };
  }, [status.online, status.title]);

  useEffect(() => {
    if (!status.online || needsPlayButton || !("wakeLock" in navigator)) return;
    let sentinel: WakeLockSentinel | null = null;
    const request = () => {
      navigator.wakeLock.request("screen").then((s) => { sentinel = s; }).catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") request();
    };
    request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      sentinel?.release().catch(() => {});
    };
  }, [status.online, needsPlayButton]);

  const handleManualPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setIsMuted(false);
    video
      .play()
      .then(() => {
        setNeedsPlayButton(false);
        if (hlsRef.current?.liveSyncPosition) {
          video.currentTime = hlsRef.current.liveSyncPosition;
        } else if (video.duration) {
          video.currentTime = video.duration;
        }
      })
      .catch(() => {});
  };

  const handleUnmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setIsMuted(false);
  };

  const handleShare = () => {
    const url = "https://peytspencer.com/live";
    posthog?.capture("live_shared", { stream_online: status.online });
    if (navigator.share) {
      navigator.share({ title: "Peyt Spencer Live", url }).catch(() => {});
      return;
    }
    navigator.clipboard.writeText(url).then(() => showToast("Link copied"));
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      return;
    }
    const stage = video.parentElement;
    if (stage?.requestFullscreen) {
      stage.requestFullscreen();
      return;
    }
    const nativeVideo = video as HTMLVideoElement & { webkitEnterFullscreen?: () => void };
    nativeVideo.webkitEnterFullscreen?.();
  };

  const renderVideoOverlay = (isMobile: boolean) => (
    <>
      {/* Top bar */}
      <div className={`absolute top-0 inset-x-0 z-30 ${isMobile ? "p-3" : "p-4"}`}>
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
                <EyeIcon size={16} weight="fill" />
                {status.viewerCount}
              </div>
              {!isMobile && (
                <>
                  <button
                    onClick={handleShare}
                    aria-label="Share"
                    className="bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60"
                  >
                    <ShareNetworkIcon size={16} weight="fill" />
                  </button>
                  <button
                    onClick={handleFullscreen}
                    aria-label="Fullscreen"
                    className="bg-black/40 text-white rounded-full p-1.5 hover:bg-black/60"
                  >
                    <CornersOutIcon size={16} weight="bold" />
                  </button>
                </>
              )}
            </div>
            {/* Action icons - mobile only */}
            {isMobile && (
              <div className="flex flex-col gap-4">
                {!isPatron && (
                  <button onClick={() => setShowNotifyPanel(!showNotifyPanel)}>
                    <BellIcon
                      size={32}
                      weight="duotone"
                      className={`drop-shadow-lg ${showNotifyPanel ? "text-blue-400" : "text-white"}`}
                    />
                  </button>
                )}
                <button onClick={handleShare} aria-label="Share">
                  <ShareNetworkIcon size={32} weight="duotone" className="text-white drop-shadow-lg" />
                </button>
                <button onClick={handleFullscreen} aria-label="Fullscreen">
                  <CornersOutIcon size={32} weight="duotone" className="text-white drop-shadow-lg" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isMuted && !needsPlayButton && (
        <button
          onClick={handleUnmute}
          className="absolute inset-0 z-20"
          data-testid="unmute-overlay"
        >
          <div className="absolute top-14 left-3 p-2 rounded-full bg-black/50 backdrop-blur">
            <SpeakerSlashIcon size={20} weight="fill" className="text-white" />
          </div>
        </button>
      )}

      {needsPlayButton && (
        <button
          onClick={handleManualPlay}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/30"
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
            <PlayIcon size={40} weight="fill" className="text-white ml-1" />
          </div>
        </button>
      )}
    </>
  );

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

  const renderOfflineState = (isMobile: boolean) => (
    <>
      <Image
        src="/images/home/new-era-6.jpg"
        alt="Peyt Spencer"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/40" />
      <div
        className={`absolute top-2 inset-x-0 h-9 grid place-items-center bg-yellow-400 overflow-hidden ${isMobile ? "z-[15]" : "z-10"}`}
      >
        <div
          className="flex items-center will-change-transform"
          style={{ animation: "marquee 60s linear infinite" }}
        >
          {[...Array(2)].map((_, j) => (
            <div key={j} className="flex shrink-0">
              {[...Array(10)].map((_, i) => (
                <span
                  key={i}
                  className="text-black font-bold text-sm tracking-wider whitespace-nowrap leading-9"
                >
                  I AM OFFLINE<span className="mx-4">·</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        className={`absolute inset-x-0 flex flex-col items-center ${isMobile ? "top-14 z-[5] px-4" : "top-16 z-10"}`}
      >
        {nextStream && (
          <>
            <p className="text-white/60 text-sm uppercase tracking-widest">Next Live</p>
            <h1
              className={`font-[family-name:var(--font-bebas)] tracking-wide text-white text-center mt-1 leading-none ${isMobile ? "text-3xl" : "text-4xl"}`}
            >
              {formatNextStream(nextStream)}
            </h1>
          </>
        )}
        {!isPatron && (
          <button
            onClick={() => setShowNotifyPanel(true)}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 hover:border-white/40 transition-all text-white text-sm font-medium"
          >
            <BellIcon size={16} weight="regular" />
            Notify me by email
          </button>
        )}
        {status.lastDisconnectTime && (
          <p
            suppressHydrationWarning
            className="mt-3 text-white/50 text-xs uppercase tracking-widest"
          >
            Last live {formatTimeAgo(status.lastDisconnectTime)}
          </p>
        )}
      </div>
    </>
  );

  return (
    <div
      className={`fixed inset-x-0 bottom-0 bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white overflow-hidden ${isOgMode ? "top-0" : "top-14"}`}
      data-og-container
    >
      {toast && <Toast message={toast} />}

      {/* Notify Panel Modal */}
      {showNotifyPanel && (
        <div
          className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowNotifyPanel(false)}
        >
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <StayConnected
              isModal={true}
              shouldShow={true}
              onClose={() => setShowNotifyPanel(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden [@media(min-width:768px)_and_(min-height:500px)]:flex absolute inset-0 items-center justify-center z-[2]">
        <div className="flex h-full">
          {/* Vertical Video Container */}
          <div
            className={`relative h-full aspect-[9/16] overflow-hidden bg-black ${isOgMode ? "rounded-2xl" : ""}`}
            data-og-video
          >
            {status.online && isDesktop === true ? (
              <>
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-contain bg-neutral-900"
                  playsInline
                />
                <div className="absolute inset-0 z-[5]" />
                {renderVideoOverlay(false)}
              </>
            ) : !status.online ? (
              renderOfflineState(false)
            ) : (
              <div className="absolute inset-0 bg-neutral-900" />
            )}
          </div>

          {/* Sidebar - hidden in OG mode */}
          {!isOgMode && (
            <div className="flex-1 min-w-0 max-w-[calc((100vh-2rem)*27/80)] h-full bg-neutral-100 dark:bg-neutral-900 flex flex-col overflow-hidden">
              {/* Shows list - show when offline */}
              {!status.online && (
                <div className="p-4 lg:p-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0 overflow-y-auto max-h-64">
                  <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-3">
                    Recent Shows
                  </p>
                  <div className="space-y-2">
                    {recentShows.map((show) => {
                      const date = formatEventDate(show.date);
                      return (
                        <div key={show.id} className="flex items-start gap-3">
                          <div className="text-center shrink-0 w-10">
                            <p className="text-xs text-neutral-500 dark:text-neutral-400">
                              {date.month}
                            </p>
                            <p className="text-lg font-bold text-neutral-900 dark:text-white leading-tight">
                              {date.day}
                            </p>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                              {show.title}
                            </p>
                            {show.location && (
                              <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
                                <MapPinIcon size={12} weight="fill" />
                                {show.location}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chat - always visible, gated when offline */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {isDesktop === true && (
                  <>
                    {isLocalhost && !commenterName && renderLocalhostNameInput()}
                    <LiveChat
                      commenterName={status.online ? commenterName : null}
                      onRequestSignIn={() => setShowNotifyPanel(true)}
                      isFloating={false}
                      isLive={status.online}
                    />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="[@media(min-width:768px)_and_(min-height:500px)]:hidden absolute inset-0 bg-black z-[2]">
        <div className="relative h-full w-full flex">
          {/* Video */}
          <div className="relative h-full w-full z-[3] bg-black flex items-center justify-center">
            {status.online && isDesktop === false ? (
              <>
                <video
                  ref={videoRef}
                  className="absolute inset-0 w-full h-full object-cover bg-neutral-900"
                  playsInline
                />
                <div className="absolute inset-x-0 top-0 h-1/2 z-[5]" />
                {renderVideoOverlay(true)}
              </>
            ) : !status.online ? (
              renderOfflineState(true)
            ) : (
              <div className="absolute inset-0 bg-neutral-900" />
            )}
            {/* Localhost mock name input - floating */}
            {isDesktop === false && isLocalhost && !commenterName && status.online && (
              <div className="absolute top-16 left-3 right-3 z-30">
                <div className="bg-yellow-500/20 backdrop-blur rounded-xl p-3">
                  <p className="text-yellow-500 text-xs mb-2">Localhost: Enter a name to test</p>
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
            {/* Chat - hidden in OG mode */}
            {isDesktop === false && !isOgMode && (
              <LiveChat
                commenterName={status.online ? commenterName : null}
                onRequestSignIn={() => setShowNotifyPanel(true)}
                isFloating={true}
                isLive={status.online}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
