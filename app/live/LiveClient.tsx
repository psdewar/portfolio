"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { usePostHog } from "posthog-js/react";
import { activatePatronStatus } from "../lib/patron";
import StayConnected, { type StayConnectedPurpose } from "../components/StayConnected";
import { Toast } from "../components/Toast";
import { useAdlibSocket } from "../hooks/useAdlibSocket";
import { useLiveStatus, type LiveStatus } from "../hooks/useLiveStatus";
import type { StreamPath } from "../lib/live";
import { usePlayer } from "./player";
import { useScrollLock } from "../hooks/useScrollLock";
import { type TimelineEvent } from "../data/timeline";
import { usePatronStatus } from "../hooks/usePatronStatus";
import { getLegDisplayName } from "../lib/shows";
import SupportModal from "../components/SupportModal";
import { type EnergyVideosHandle } from "../components/EnergyVideos";
import { EARLY_ACCESS_PREVIEW } from "../data/patron-config";
import { useLiveLayout } from "./useLiveLayout";
import { useStageVideo, type StageProps } from "./Stage";
import { DesktopTree } from "./DesktopTree";
import { MobileTree } from "./MobileTree";
import { type EnergyClipHandlers } from "./LiveClips";
import { type LiveSupportAskCore } from "./LiveSupportAsk";

const WHEP_URL = process.env.NEXT_PUBLIC_WHEP_URL || "/live/whep";
const HLS_URL = process.env.NEXT_PUBLIC_HLS_URL || "http://localhost:8888/live_aac/index.m3u8";

export default function LiveClient({
  pastShows,
  initialStatus,
  nextStream,
  upcomingShows,
  concertCount,
  tripLeg,
  path = "live",
}: {
  pastShows: TimelineEvent[];
  initialStatus: LiveStatus;
  nextStream: string | null;
  upcomingShows: TimelineEvent[];
  concertCount: number;
  tripLeg?: string | null;
  path?: StreamPath;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const posthog = usePostHog();
  const isPatron = usePatronStatus();
  const isOgMode = searchParams.get("og") === "true";
  const whepUrl = WHEP_URL.replace("/live/whep", `/${path}/whep`);
  const hlsUrl = HLS_URL.replace("/live_aac/", `/${path}_aac/`);
  const viewStartTime = useRef<number>(Date.now());

  const liveStatus = useLiveStatus({ initial: initialStatus, path });
  const status: LiveStatus = liveStatus;
  const [toast, setToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notifyPurpose, setNotifyPurpose] = useState<StayConnectedPurpose | null>(null);
  useScrollLock(notifyPurpose !== null);
  const [elapsedTime, setElapsedTime] = useState("");
  const tripPlace = tripLeg ? getLegDisplayName(tripLeg) : null;
  type LoudSource = "energyClip" | "preview";
  const loudOwnerRef = useRef<LoudSource | null>(null);
  const energyVideosRef = useRef<EnergyVideosHandle>(null);
  const silencePreviewRef = useRef<(() => void) | null>(null);
  const streamMutedBeforeLoudRef = useRef<boolean | null>(null);
  const silenceLoudSource = (source: LoudSource) => {
    if (source === "energyClip") energyVideosRef.current?.silence();
    else silencePreviewRef.current?.();
  };
  const handleLoudStart = (source: LoudSource) => {
    const previous = loudOwnerRef.current;
    if (previous === source) return;
    loudOwnerRef.current = source;
    if (previous) silenceLoudSource(previous);
    const video = player.videoRef.current;
    if (video && streamMutedBeforeLoudRef.current === null) {
      streamMutedBeforeLoudRef.current = video.muted;
      player.setMuted(true);
    }
  };
  const handleLoudEnd = (source: LoudSource) => {
    if (loudOwnerRef.current !== source) return;
    loudOwnerRef.current = null;
    const video = player.videoRef.current;
    if (video && streamMutedBeforeLoudRef.current !== null) {
      const restore = streamMutedBeforeLoudRef.current;
      streamMutedBeforeLoudRef.current = null;
      player.setMuted(restore);
    }
  };
  const handleEnergyClipLoudStart = () => handleLoudStart("energyClip");
  const handleEnergyClipLoudEnd = () => handleLoudEnd("energyClip");
  const handlePreviewLoudStart = () => handleLoudStart("preview");
  const handlePreviewLoudEnd = () => handleLoudEnd("preview");
  const thanksHandled = useRef(false);
  const adlib = useAdlibSocket(() => setNotifyPurpose("chat"), path);

  const isDevEnv = process.env.NODE_ENV !== "production";
  const demoParam = searchParams.get("adlibDemo")?.toLowerCase() ?? null;
  const demoOrientation = isDevEnv && (demoParam === "portrait" || demoParam === "landscape") ? demoParam : null;
  const isDemo = demoOrientation !== null;

  const isLive = isDemo ? true : status.live;
  const player = usePlayer({ isLive, isDemo, path, whepUrl, hlsUrl, posthog });
  const streamAspect = isLive
    ? isDemo
      ? demoOrientation === "landscape"
        ? 16 / 9
        : 9 / 16
      : (player.videoAspect ?? 9 / 16)
    : null;
  const stageAspect = streamAspect ?? 16 / 9;

  const [supportModalOpen, setSupportModalOpen] = useState(false);

  const {
    isDesktop,
    isShortViewport,
    fullBleedDesktop,
    vvHeight,
    mobileOfflineScroll,
    railRowCount,
    railNavRef,
    railCompact,
    railMotionStyle,
    desktopRowRef,
    handleDesktopScheduleMeasured,
    handleBandFloorMeasured,
    chatCollapsed,
    setChatCollapsed,
    mobileColRef,
    handleMobileScheduleMeasured,
    railNavExpanded,
    useSchemeS,
    desktopStageHeightPx,
    desktopStageWidthPx,
    desktopChatRailVisible,
    desktopLeftColWidthPx,
    desktopPhotoFit,
    stageNarrow,
    schemeSStripHeightPx,
    naturalClipsWidth,
    mobileLandscape,
    mobileStageHeightPx,
    mobileStageConstrained,
    mobilePhotoFit,
    mobilePanelChat,
  } = useLiveLayout({ isOgMode, isLive, stageAspect });

  const { desktopStageSlotRef, mobileStageSlotRef, setVideoHome, stageVideo } = useStageVideo({
    isLive,
    isDesktop,
    isDemo,
    videoRef: player.videoRef,
  });

  useEffect(() => {
    if (!isOgMode) return;
    document.documentElement.classList.add("og-mode");
    return () => document.documentElement.classList.remove("og-mode");
  }, [isOgMode]);

  const onlineRef = useRef(isLive);
  onlineRef.current = isLive;

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
        stream_path: path,
      });
    };
  }, [posthog, path]);

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

    if (!isLive) {
      router.replace("/listen?success=patron_live");
      return;
    }

    showToast("Thank you for supporting.");
    window.history.replaceState({}, "", "/live");
  }, [searchParams, posthog, isLive, router]);

  const liveStartTime = status.since;

  useEffect(() => {
    if (!isLive || !liveStartTime) {
      setElapsedTime("");
      return;
    }

    const updateElapsed = () => {
      const now = Date.now();
      const diff = Math.floor((now - liveStartTime) / 1000);

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
  }, [isLive, liveStartTime]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (!isLive) {
      navigator.mediaSession.metadata = null;
      return;
    }
    navigator.mediaSession.metadata = new MediaMetadata({
      title: "Live",
      artist: "Peyt Spencer",
      artwork: [{ src: "https://peytspencer.com/images/home/new-era-6.jpg", type: "image/jpeg" }],
    });
    navigator.mediaSession.setActionHandler("play", () => player.videoRef.current?.play());
    navigator.mediaSession.setActionHandler("pause", () => player.videoRef.current?.pause());
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
    };
  }, [isLive, player.videoRef]);

  useEffect(() => {
    if (!isLive || player.needsPlayButton || !("wakeLock" in navigator)) return;
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
  }, [isLive, player.needsPlayButton]);

  const onOpenSupport = () => setSupportModalOpen(true);

  const energyClip: EnergyClipHandlers = {
    energyVideosRef,
    onLoudStart: handleEnergyClipLoudStart,
    onLoudEnd: handleEnergyClipLoudEnd,
  };

  const supportAsk: LiveSupportAskCore = {
    upcomingShows,
    pastShows,
    onOpenSupport,
    place: tripPlace,
  };

  const stageProps: Omit<StageProps, "isDesktopStage"> = {
    isDemo,
    demoOrientation,
    isLive,
    isDesktop,
    mobileLandscape,
    player,
    adlib,
    elapsedTime,
    isPatron,
    notifyPurpose,
    setNotifyPurpose,
    chatCollapsed,
    onShowChat: () => setChatCollapsed(false),
    onOpenSupport,
    showToast,
    posthog,
    nextStream,
    desktopPhotoFit,
    mobilePhotoFit,
    mobileStageConstrained,
    stageNarrow,
  };

  const clearsHeader = !isOgMode && !fullBleedDesktop;
  return (
    <div
      className={
        mobileOfflineScroll
          ? "relative bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white"
          : `fixed inset-x-0 bottom-0 bg-neutral-50 dark:bg-black text-neutral-900 dark:text-white overflow-hidden ${
              clearsHeader ? "" : "top-0"
            }`
      }
      style={
        mobileOfflineScroll
          ? {
              minHeight:
                vvHeight != null
                  ? `calc(${vvHeight}px - var(--header-h, 56px))`
                  : "calc(100dvh - var(--header-h, 56px))",
            }
          : {
              ...(clearsHeader ? { top: "var(--header-h, 56px)" } : {}),
              ...(fullBleedDesktop
                ? { height: "100dvh" }
                : !isOgMode && vvHeight != null
                  ? { height: `calc(${vvHeight}px - var(--header-h, 56px))` }
                  : {}),
            }
      }
      data-og-container
    >
      {toast && <Toast message={toast} />}

      {notifyPurpose && (
        <div
          className="fixed inset-0 z-[50] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setNotifyPurpose(null)}
        >
          <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <StayConnected
              isModal={true}
              shouldShow={true}
              purpose={notifyPurpose}
              onClose={() => setNotifyPurpose(null)}
            />
          </div>
        </div>
      )}

      <DesktopTree
        desktopRowRef={desktopRowRef}
        railNavExpanded={railNavExpanded}
        railRowCount={railRowCount}
        railNavRef={railNavRef}
        railCompact={railCompact}
        isLive={isLive}
        supportAsk={supportAsk}
        isDesktop={isDesktop}
        energyClip={energyClip}
        useSchemeS={useSchemeS}
        desktopLeftColWidthPx={desktopLeftColWidthPx}
        desktopStageHeightPx={desktopStageHeightPx}
        desktopStageWidthPx={desktopStageWidthPx}
        isShortViewport={isShortViewport}
        handleDesktopScheduleMeasured={handleDesktopScheduleMeasured}
        handleBandFloorMeasured={handleBandFloorMeasured}
        schemeSStripHeightPx={schemeSStripHeightPx}
        naturalClipsWidth={naturalClipsWidth}
        railMotionStyle={railMotionStyle}
        desktopStageSlotRef={desktopStageSlotRef}
        desktopChatRailVisible={desktopChatRailVisible}
        adlib={adlib}
        onHideChat={() => setChatCollapsed(true)}
        stageProps={stageProps}
      />

      <MobileTree
        mobileColRef={mobileColRef}
        mobileStageSlotRef={mobileStageSlotRef}
        isLive={isLive}
        isOgMode={isOgMode}
        isDesktop={isDesktop}
        mobileOfflineScroll={mobileOfflineScroll}
        mobileStageHeightPx={mobileStageHeightPx}
        mobileLandscape={mobileLandscape}
        mobilePanelChat={mobilePanelChat}
        stageAspect={stageAspect}
        supportAsk={supportAsk}
        handleMobileScheduleMeasured={handleMobileScheduleMeasured}
        energyClip={energyClip}
        adlib={adlib}
        stageProps={stageProps}
      />

      <div ref={setVideoHome} style={{ display: "none" }} aria-hidden />
      {stageVideo}

      <SupportModal
        open={supportModalOpen}
        onOpenChange={setSupportModalOpen}
        source="live"
        showFundSection
        concertCount={concertCount}
        preview={EARLY_ACCESS_PREVIEW}
        onLoudPlay={handlePreviewLoudStart}
        onLoudEnd={handlePreviewLoudEnd}
        onRegisterSilence={(silence) => {
          silencePreviewRef.current = silence;
        }}
      />
    </div>
  );
}
