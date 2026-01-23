"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import Image from "next/image";
import Hls from "hls.js";
import StayConnected from "../components/StayConnected";
import LiveChat from "../components/LiveChat";
import { PatronModal } from "../components/PatronModal";
import { useLiveStatus } from "../hooks/useLiveStatus";
import { formatNextStream } from "../lib/dates";
import {
  EyeIcon,
  GiftIcon,
  BellIcon,
  SpeakerSlashIcon,
  PlayIcon,
  MicrophoneStageIcon,
} from "@phosphor-icons/react";
import { useAudio } from "../contexts/AudioContext";
import { useDevTools } from "../contexts/DevToolsContext";

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
  const { currentTrack } = useAudio();
  const { simulatePatron } = useDevTools();
  const hasAudioPlayer = !!currentTrack;
  const isOgMode = searchParams.get("og") === "true";
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const viewStartTime = useRef<number>(Date.now());
  const [isDesktop, setIsDesktop] = useState(isOgMode); // OG mode forces desktop
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [nextStreamDate, setNextStreamDate] = useState<string | null>(null);

  // Use SSE-based live status (no polling!)
  // Disable when video is playing - the stream itself is proof we're live
  const liveStatus = useLiveStatus({ enabled: !videoPlaying });
  const status: StreamStatus = {
    online: liveStatus.online || videoPlaying, // If video is playing, we're online
    viewerCount: liveStatus.viewerCount,
    title: liveStatus.title,
    lastConnectTime: liveStatus.lastConnectTime,
  };
  const isLoading = isOgMode ? false : liveStatus.isLoading;
  const [showThanks, setShowThanks] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [showPatronModal, setShowPatronModal] = useState(false);
  const [showNotifyPanel, setShowNotifyPanel] = useState(false);
  const [commenterName, setCommenterName] = useState<string | null>(null);
  const [isPatron, setIsPatron] = useState(false);
  const [mockNameInput, setMockNameInput] = useState("");
  const [elapsedTime, setElapsedTime] = useState("");
  const [needsPlayButton, setNeedsPlayButton] = useState(true);
  const [isMuted, setIsMuted] = useState(true);

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

  useEffect(() => {
    const storedName = localStorage.getItem("liveCommenterName");
    setCommenterName(storedName);
    const patronStatus = localStorage.getItem("patronStatus");
    const patronEmail = localStorage.getItem("patronEmail");
    setIsPatron((patronStatus === "active" && !!patronEmail) || simulatePatron);
  }, [showNotifyPanel, simulatePatron]);

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

  useEffect(() => {
    if (searchParams.get("thanks") === "1") {
      localStorage.setItem("patronStatus", "active");
      setIsPatron(true);
      setShowThanks(true);
      posthog?.capture("patron_checkout_completed", { source: "live" });
      window.history.replaceState({}, "", "/live");
      const timer = setTimeout(() => setShowThanks(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams, posthog]);

  // Status now comes from useLiveStatus hook via SSE (no polling!)

  useEffect(() => {
    fetch("/api/schedule")
      .then((res) => res.json())
      .then((data) => {
        if (data.nextStream) {
          setNextStreamDate(data.nextStream);
        }
      })
      .catch(() => {});
  }, []);


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
          `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
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
    if (!status.online) return;

    const video = isDesktop ? desktopVideoRef.current : mobileVideoRef.current;
    if (!video) return;

    const src = `${OWNCAST_URL}/hls/stream.m3u8`;

    const tryAutoplay = (hls?: Hls) => {
      video.muted = true;
      setIsMuted(true);
      video
        .play()
        .then(() => {
          setNeedsPlayButton(false);
          setVideoPlaying(true);
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
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src;
      video.addEventListener("loadedmetadata", () => tryAutoplay(), {
        once: true,
      });
    }
  }, [status.online, isDesktop]);

  const handleManualPlay = () => {
    const video = isDesktop ? desktopVideoRef.current : mobileVideoRef.current;
    if (!video) return;
    video.muted = false;
    setIsMuted(false);
    video
      .play()
      .then(() => {
        setNeedsPlayButton(false);
        setVideoPlaying(true);
        if (hlsRef.current?.liveSyncPosition) {
          video.currentTime = hlsRef.current.liveSyncPosition;
        } else if (video.duration) {
          video.currentTime = video.duration;
        }
      })
      .catch(() => {});
  };

  const handleUnmute = () => {
    const video = isDesktop ? desktopVideoRef.current : mobileVideoRef.current;
    if (!video) return;
    video.muted = false;
    setIsMuted(false);
  };

  const closePanels = () => {
    setShowPatronModal(false);
    setShowNotifyPanel(false);
  };

  const renderVideoOverlay = (isMobile: boolean) => (
    <>
      {/* Top bar */}
      <div className={`absolute top-0 inset-x-0 z-10 ${isMobile ? "p-3" : "p-4"}`}>
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
            </div>
            {/* Action icons - mobile only */}
            {isMobile && (
              <div className="flex flex-col gap-4">
                {!isPatron && (
                  <>
                    <button
                      onClick={() => {
                        setShowNotifyPanel(false);
                        setShowPatronModal(true);
                      }}
                    >
                      <GiftIcon size={32} weight="duotone" className="drop-shadow-lg text-white" />
                    </button>
                    <button
                      onClick={() => {
                        setShowPatronModal(false);
                        setShowNotifyPanel(!showNotifyPanel);
                      }}
                    >
                      <BellIcon
                        size={32}
                        weight="duotone"
                        className={`drop-shadow-lg ${showNotifyPanel ? "text-blue-400" : "text-white"}`}
                      />
                    </button>
                  </>
                )}
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

  return (
    <div className={`fixed left-0 right-0 bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white overflow-hidden ${isOgMode ? "top-0" : "top-14"} ${hasAudioPlayer && !isOgMode ? "bottom-16" : "bottom-0"}`} data-og-container>
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
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <StayConnected
              isModal={true}
              shouldShow={true}
              onClose={() => setShowNotifyPanel(false)}
            />
          </div>
        </div>
      )}

      {/* Patron Modal */}
      <PatronModal isOpen={showPatronModal} onClose={() => setShowPatronModal(false)} />

      {/* Desktop Layout */}
      <div className="hidden [@media(min-width:768px)_and_(min-height:500px)]:flex absolute inset-4 items-center justify-center z-[2]">
        {isLoading ? (
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="flex h-full">
            {/* Vertical Video Container */}
            <div className={`relative h-full aspect-[9/16] overflow-hidden bg-black ${isOgMode ? "rounded-2xl" : "rounded-l-2xl"}`} data-og-video>
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
                  <div className="absolute top-0 inset-x-0 h-9 grid place-items-center bg-yellow-400 overflow-hidden z-10">
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
                  <div className="absolute top-16 inset-x-0 flex flex-col items-center z-10">
                    {nextStreamDate && (
                      <>
                        <p className="text-white/60 text-sm uppercase tracking-widest">Next Live</p>
                        <h1 className="font-[family-name:var(--font-bebas)] text-4xl tracking-wide text-white text-center mt-1 leading-none">
                          {formatNextStream(nextStreamDate)}
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
                  </div>
                </>
              )}
            </div>

            {/* Sidebar - hidden in OG mode */}
            {!isOgMode && <div className="flex-1 min-w-0 max-w-[calc((100vh-2rem)*27/80)] h-full bg-neutral-100 dark:bg-neutral-900 rounded-r-2xl flex flex-col overflow-hidden">
              {/* Support Section - only show for non-patrons */}
              {!isPatron && (
                <div className="p-4 lg:p-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                  <button
                    onClick={() => setShowPatronModal(true)}
                    className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-medium flex items-center justify-center gap-2 transition-colors"
                  >
                    <MicrophoneStageIcon size={28} weight="regular" />
                    Become my patron
                  </button>
                </div>
              )}

              {/* Merch teaser - show when offline */}
              {!status.online && (
                <div className="p-4 lg:p-5 border-b border-neutral-200 dark:border-neutral-800 shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0">
                      <Image
                        src="/images/merch/exhibit-psd-merch.JPG"
                        alt="Exhibit PSD Shirt"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-neutral-900 dark:text-white">Limited Edition Tee</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">Available at shows</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Chat - always visible, gated when offline */}
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {isLocalhost && !commenterName && renderLocalhostNameInput()}
                <LiveChat
                  commenterName={status.online ? commenterName : null}
                  onRequestSignIn={() => setShowNotifyPanel(true)}
                  isFloating={false}
                />
              </div>
            </div>}
          </div>
        )}
      </div>

      {/* Mobile Layout */}
      <div className="[@media(min-width:768px)_and_(min-height:500px)]:hidden absolute inset-0 bg-black z-[2]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="relative h-full w-full flex">
            {/* Video */}
            <div className="relative h-full w-full z-[3] bg-black flex items-center justify-center">
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
                  {/* Offline top bar - below marquee */}
                  <div className="absolute top-10 inset-x-0 z-10 p-3">
                    {!isOgMode && (
                      <div className="flex items-start justify-between">
                        <div />
                        <div className="flex flex-col items-end gap-4">
                          <div />
                          {/* Action icons - mobile only, hidden for patrons */}
                          {!isPatron && (
                            <div className="flex flex-col gap-4">
                              <button
                                onClick={() => {
                                  setShowNotifyPanel(false);
                                  setShowPatronModal(true);
                                }}
                              >
                                <GiftIcon size={32} weight="duotone" className="drop-shadow-lg text-white" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="absolute top-2 inset-x-0 h-9 grid place-items-center bg-yellow-400 overflow-hidden z-[15]">
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
                  <div className="absolute top-14 inset-x-0 flex flex-col items-center z-[5] px-4">
                    {nextStreamDate && (
                      <>
                        <p className="text-white/60 text-sm uppercase tracking-widest">Next Live</p>
                        <h1 className="font-[family-name:var(--font-bebas)] text-3xl tracking-wide text-white text-center mt-1 leading-none">
                          {formatNextStream(nextStreamDate)}
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
                  </div>
                </>
              )}
              {/* Localhost mock name input - floating */}
              {isLocalhost && !commenterName && status.online && (
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
              {!isOgMode && (
                <LiveChat
                  commenterName={status.online ? commenterName : null}
                  onRequestSignIn={() => setShowNotifyPanel(true)}
                  isFloating={true}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
