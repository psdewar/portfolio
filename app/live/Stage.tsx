"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type RefObject,
  type SetStateAction,
} from "react";
import Image from "next/image";
import type { PostHog } from "posthog-js";
import {
  BellIcon,
  SpeakerSlashIcon,
  SpeakerHighIcon,
  PlayIcon,
  CornersOutIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import { AdlibChatOverlay } from "../components/AdlibChatOverlay";
import { AdlibReactions } from "../components/AdlibReactions";
import type { StayConnectedPurpose } from "../components/StayConnected";
import type { UsePlayerResult } from "./player";
import type { UseAdlibSocketResult } from "../hooks/useAdlibSocket";
import { HoverTip, useHoverTip } from "./HoverTip";

type FullscreenDocument = Document & { webkitFullscreenElement?: Element | null };

export function chatToggleIcon(mirrored: boolean, dropShadow: boolean) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        ...(mirrored ? { transform: "scaleX(-1)" } : {}),
        ...(dropShadow ? { filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.5))" } : {}),
      }}
      aria-hidden
    >
      <line x1={4} y1={4} x2={4} y2={20} />
      <line x1={8} y1={12} x2={20} y2={12} />
      <polyline points="15,7 20,12 15,17" />
    </svg>
  );
}

function ShowChatButton({ onShowChat }: { onShowChat: () => void }) {
  const iconRef = useRef<HTMLSpanElement>(null);
  const { open, bind } = useHoverTip();
  return (
    <>
      <button
        type="button"
        onClick={onShowChat}
        aria-label="Show chat"
        aria-expanded={false}
        className="p-2.5 flex items-center justify-center text-white hover:opacity-70 transition-opacity"
        {...bind}
      >
        <span ref={iconRef} className="inline-flex">
          {chatToggleIcon(true, true)}
        </span>
      </button>
      <HoverTip open={open} anchorRef={iconRef} label="Expand" side="left" />
    </>
  );
}

const DEMO_VIDEO_CLASS = "absolute inset-0 h-full w-full opacity-0 pointer-events-none";
const LIVE_VIDEO_CLASS = "absolute inset-0 h-full w-full object-contain bg-neutral-900";

export function useStageVideo({
  isLive,
  isDesktop,
  isDemo,
  videoRef,
}: {
  isLive: boolean;
  isDesktop: boolean | null;
  isDemo: boolean;
  videoRef: RefObject<HTMLVideoElement>;
}) {
  const desktopStageSlotRef = useRef<HTMLDivElement | null>(null);
  const mobileStageSlotRef = useRef<HTMLDivElement | null>(null);
  const [videoHome, setVideoHome] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    let slot: HTMLDivElement | null = null;
    if (isLive) {
      if (isDesktop === true) slot = desktopStageSlotRef.current;
      else if (isDesktop === false) slot = mobileStageSlotRef.current;
    }
    const target = slot ?? videoHome;
    if (!target) return;
    const mutableRef = videoRef as MutableRefObject<HTMLVideoElement | null>;
    let video = mutableRef.current;
    if (!video) {
      video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      mutableRef.current = video;
    }
    video.className = isDemo ? DEMO_VIDEO_CLASS : LIVE_VIDEO_CLASS;
    if (isDemo) video.setAttribute("aria-hidden", "true");
    else video.removeAttribute("aria-hidden");
    if (video.parentNode !== target) target.appendChild(video);
  });

  useLayoutEffect(
    () => () => {
      videoRef.current?.remove();
    },
    [videoRef],
  );

  return { desktopStageSlotRef, mobileStageSlotRef, setVideoHome };
}

const CONTROLS_TOUCH_MS = 3000;
const CONTROLS_POINTER_MS = 2500;
const MUTE_LABEL_MS = 4000;

function useControlsAutoHide(host: HTMLElement | null, active: boolean) {
  const [shown, setShown] = useState(true);
  useEffect(() => {
    if (!host || !active) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const clear = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };
    const show = (ms: number) => {
      clear();
      setShown(true);
      timer = setTimeout(() => setShown(false), ms);
    };
    const onDown = (e: PointerEvent) =>
      show(e.pointerType === "touch" ? CONTROLS_TOUCH_MS : CONTROLS_POINTER_MS);
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "touch") show(CONTROLS_POINTER_MS);
    };
    const onLeave = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      clear();
      setShown(false);
    };
    show(CONTROLS_TOUCH_MS);
    host.addEventListener("pointerdown", onDown);
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerenter", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      clear();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerenter", onMove);
      host.removeEventListener("pointerleave", onLeave);
    };
  }, [host, active]);
  return !active || shown;
}

export interface StageProps {
  isDesktopStage: boolean;
  isDemo: boolean;
  demoOrientation: "portrait" | "landscape" | null;
  isLive: boolean;
  isDesktop: boolean | null;
  mobileLandscape: boolean;
  player: UsePlayerResult;
  adlib: UseAdlibSocketResult;
  elapsedTime: string;
  isPatron: boolean;
  notifyPurpose: StayConnectedPurpose | null;
  setNotifyPurpose: Dispatch<SetStateAction<StayConnectedPurpose | null>>;
  chatCollapsed: boolean;
  onShowChat: () => void;
  onOpenSupport: () => void;
  showToast: (message: string) => void;
  posthog: PostHog | undefined;
  nextStream: string | null;
  desktopPhotoFit: number;
  mobilePhotoFit: number;
  mobileStageConstrained: boolean;
  stageNarrow: boolean;
}

export function Stage({
  isDesktopStage,
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
  onShowChat,
  onOpenSupport,
  showToast,
  posthog,
  nextStream,
  desktopPhotoFit,
  mobilePhotoFit,
  mobileStageConstrained,
  stageNarrow,
}: StageProps) {
  const isMobile = !isDesktopStage;
  const [overlayEl, setOverlayEl] = useState<HTMLDivElement | null>(null);
  const controlsVisible = useControlsAutoHide(
    overlayEl?.parentElement ?? null,
    !player.needsPlayButton && !player.needsResume,
  );

  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const update = () => {
      const fsDoc = document as FullscreenDocument;
      const fsEl = fsDoc.fullscreenElement ?? fsDoc.webkitFullscreenElement ?? null;
      const stageEl = player.videoRef.current?.parentElement ?? null;
      setFullscreen(fsEl !== null && fsEl === stageEl);
    };
    document.addEventListener("fullscreenchange", update);
    document.addEventListener("webkitfullscreenchange", update);
    update();
    return () => {
      document.removeEventListener("fullscreenchange", update);
      document.removeEventListener("webkitfullscreenchange", update);
    };
  }, [player.videoRef]);

  const handleShare = () => {
    const url = "https://peytspencer.com/live";
    posthog?.capture("live_shared", { stream_online: isLive });
    if (navigator.share) {
      navigator.share({ title: "Peyt Spencer Live", url }).catch(() => {});
      return;
    }
    navigator.clipboard.writeText(url).then(() => showToast("Link copied"));
  };

  const handleFullscreen = () => {
    const video = player.videoRef.current;
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

  const fadeCls = `transition-opacity duration-200 motion-reduce:transition-none focus-visible:opacity-100 has-[:focus-visible]:opacity-100 ${
    controlsVisible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none focus-visible:pointer-events-auto has-[:focus-visible]:pointer-events-auto"
  }`;

  const pillMode = player.isMuted && !player.needsPlayButton;
  const [pillLabelOpen, setPillLabelOpen] = useState(true);
  useEffect(() => {
    if (!pillMode) return;
    setPillLabelOpen(true);
    const timer = setTimeout(() => setPillLabelOpen(false), MUTE_LABEL_MS);
    return () => clearTimeout(timer);
  }, [pillMode]);

  const renderVolumePill = (mobile: boolean) =>
    isLive && !player.needsPlayButton ? (
      <button
        onClick={pillMode ? player.handleUnmute : player.handleToggleMute}
        aria-label={pillMode ? "Unmute" : "Mute"}
        data-testid="volume-pill"
        className={`relative flex min-h-7 items-center ${mobile ? "py-[3px]" : "py-0.5"} text-sm text-white ${
          pillMode ? "pointer-events-auto" : fadeCls
        }`}
      >
        <span aria-hidden className="absolute -inset-2" />
        {pillMode ? (
          <SpeakerSlashIcon size={mobile ? 22 : 24} weight="duotone" className="shrink-0 drop-shadow-lg" />
        ) : (
          <SpeakerHighIcon size={mobile ? 22 : 24} weight="duotone" className="shrink-0 drop-shadow-lg" />
        )}
        {pillMode && (
          <span
            className={`overflow-hidden transition-[max-width] duration-200 motion-reduce:transition-none ${
              pillLabelOpen ? "max-w-40" : "max-w-0"
            }`}
          >
            <span className="block whitespace-nowrap pl-1 [text-shadow:0_0_2px_rgb(0_0_0/0.9),0_1px_4px_rgb(0_0_0/0.7)]">Tap to unmute</span>
          </span>
        )}
      </button>
    ) : null;

  const renderShowChatButton = (mobile: boolean) =>
    isLive && !mobile && chatCollapsed ? (
      <span className={`inline-flex ${fadeCls}`}>
        <ShowChatButton onShowChat={onShowChat} />
      </span>
    ) : null;

  const renderVideoOverlay = (mobile: boolean) => (
    <>
      <div ref={setOverlayEl} className={`pointer-events-none absolute top-0 inset-x-0 z-30 ${mobile ? "p-3" : "p-4"}`}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-[1px] text-sm font-bold bg-red-500 text-white">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </div>
            {elapsedTime && (
              <div className="py-1 text-sm text-white tabular-nums [text-shadow:0_0_2px_rgb(0_0_0/0.9),0_1px_4px_rgb(0_0_0/0.7)]">
                {elapsedTime}
              </div>
            )}
            {renderVolumePill(mobile)}
          </div>
          <div className="-mt-2 flex flex-col items-end gap-4">
            <div className={mobile ? "hidden" : "flex items-center gap-2"}>
              {!mobile && (
                <>
                  <button
                    onClick={handleShare}
                    aria-label="Share"
                    className={`min-h-11 min-w-11 flex items-center justify-center hover:opacity-70 ${fadeCls}`}
                  >
                    <ShareNetworkIcon size={24} weight="duotone" className="text-white drop-shadow-lg" />
                  </button>
                  <button
                    onClick={handleFullscreen}
                    aria-label="Fullscreen"
                    className={`min-h-11 min-w-11 flex items-center justify-center hover:opacity-70 ${fadeCls}`}
                  >
                    <CornersOutIcon size={24} weight="bold" className="text-white drop-shadow-lg" />
                  </button>
                </>
              )}
              {renderShowChatButton(mobile)}
            </div>
            {mobile && (
              <div className="flex flex-col gap-0">
                {!isPatron && (
                  <button
                    onClick={() => setNotifyPurpose((p) => (p ? null : "notify"))}
                    aria-label="Notify me by email"
                    className={`min-h-11 min-w-11 flex items-center justify-center ${fadeCls}`}
                  >
                    <BellIcon
                      size={22}
                      weight="duotone"
                      className={`drop-shadow-lg ${notifyPurpose ? "text-blue-400" : "text-white"}`}
                    />
                  </button>
                )}
                <button
                  onClick={handleShare}
                  aria-label="Share"
                  className={`min-h-11 min-w-11 flex items-center justify-center ${fadeCls}`}
                >
                  <ShareNetworkIcon size={22} weight="duotone" className="text-white drop-shadow-lg" />
                </button>
                <button
                  onClick={handleFullscreen}
                  aria-label="Fullscreen"
                  className={`min-h-11 min-w-11 flex items-center justify-center ${fadeCls}`}
                >
                  <CornersOutIcon size={22} weight="bold" className="text-white drop-shadow-lg" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {player.isMuted && !player.needsPlayButton && (
        <button
          onClick={player.handleUnmute}
          className="absolute inset-0 z-20"
          data-testid="unmute-overlay"
          aria-label="Unmute"
        />
      )}

      {player.needsPlayButton && (
        <button
          onClick={player.handleManualPlay}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/30"
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
            <PlayIcon size={40} weight="fill" className="text-white ml-1" />
          </div>
        </button>
      )}

      {player.needsResume && !player.needsPlayButton && (
        <button
          onClick={player.handleResume}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/30"
          data-testid="resume-overlay"
        >
          <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors">
            <PlayIcon size={40} weight="fill" className="text-white ml-1" />
          </div>
        </button>
      )}
    </>
  );

  const nextStreamHasTime = !!nextStream && /T\d{2}:\d{2}/.test(nextStream);
  const nextStreamDate = nextStream
    ? new Date(nextStreamHasTime ? nextStream : `${nextStream}T12:00:00`)
    : null;
  const marqueeText = nextStreamDate
    ? `Next stream ${nextStreamDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}${
        nextStreamHasTime
          ? ` at ${nextStreamDate.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" })}`
          : ""
      }`
    : "I AM OFFLINE";
  const marqueeRow = (
    <div
      key={"marquee-row"}
      className="flex h-9 items-center will-change-transform"
      style={{ animation: "marquee 60s linear infinite" }}
    >
      {[...Array(2)].map((_, j) => (
        <div key={j} className="flex h-9 shrink-0 items-center">
          {[...Array(10)].map((_, i) => (
            <span
              key={i}
              className="text-black font-bold text-sm tracking-wider whitespace-nowrap leading-none"
            >
              {marqueeText}
              <span aria-hidden className="inline-block w-[2.5em]" />
            </span>
          ))}
        </div>
      ))}
    </div>
  );

  const renderOfflineState = (mobile: boolean) => {
    const notifyPill = !isPatron && (
      !mobile && stageNarrow ? (
        <button
          onClick={() => setNotifyPurpose("notify")}
          aria-label="Notify me by email"
          className="h-11 w-11 flex items-center justify-center rounded-full bg-white text-neutral-900 shadow-lg hover:bg-neutral-100 transition-colors"
        >
          <BellIcon size={18} weight="bold" />
        </button>
      ) : (
        <button
          onClick={() => setNotifyPurpose("notify")}
          className={`min-h-11 flex items-center gap-2 rounded-full bg-white text-neutral-900 shadow-lg hover:bg-neutral-100 transition-colors whitespace-nowrap font-medium ${
            mobile ? "px-3 py-2 text-xs" : "px-5 py-2.5 text-sm"
          }`}
        >
          <BellIcon size={16} weight="bold" />
          Notify me by email
        </button>
      )
    );
    const photo = mobile ? (
      mobileStageConstrained ? (
        <Image
          src="/images/home/new-era-6.jpg"
          alt="Peyt Spencer"
          fill
          className="object-cover"
          style={{ objectPosition: `50% ${mobilePhotoFit.toFixed(1)}px` }}
          priority
        />
      ) : (
        <Image
          src="/images/home/new-era-6.jpg"
          alt="Peyt Spencer"
          fill
          className="object-contain"
          priority
        />
      )
    ) : (
      <Image
        src="/images/home/new-era-6.jpg"
        alt="Peyt Spencer"
        fill
        className="object-cover"
        style={{ objectPosition: `50% ${desktopPhotoFit.toFixed(1)}px` }}
        priority
      />
    );
    return (
      <>
        {photo}
        <div
          className="absolute top-0 inset-x-0 h-9 z-10 flex items-center overflow-hidden"
          style={{ backgroundImage: "linear-gradient(#facc15, #facc15)" }}
        >
          {marqueeRow}
        </div>
        <div className="absolute inset-x-0 top-9 z-10 flex justify-end gap-2 px-4 pt-3">
          {notifyPill}
        </div>
      </>
    );
  };

  if (isDemo) {
    return (
      <>
        <div className="absolute inset-0 bg-black" aria-hidden />
        <svg
          viewBox={demoOrientation === "portrait" ? "0 0 9 16" : "0 0 16 9"}
          preserveAspectRatio="xMidYMid meet"
          className="absolute inset-0 h-full w-full"
          aria-hidden
        >
          <rect width="100%" height="100%" fill="#404040" />
        </svg>
        <span
          className="absolute top-3 left-3 z-10 text-xs uppercase tracking-widest text-neutral-400"
          aria-hidden
        >
          {demoOrientation} demo
        </span>
        {renderVideoOverlay(isMobile)}
        <AdlibReactions floating={adlib.floatingReactions} onReact={adlib.react} hideButtons />
        {isDesktopStage && fullscreen && (
          <AdlibChatOverlay socket={adlib} onOpenSupport={onOpenSupport} desktopFullscreen />
        )}
      </>
    );
  }
  if (isLive && isDesktop === isDesktopStage) {
    return (
      <>
        <div className="absolute inset-0 z-[5]" />
        {renderVideoOverlay(isMobile)}
        <AdlibReactions floating={adlib.floatingReactions} onReact={adlib.react} hideButtons />
        {isDesktopStage && fullscreen && (
          <AdlibChatOverlay socket={adlib} onOpenSupport={onOpenSupport} desktopFullscreen />
        )}
      </>
    );
  }
  if (!isLive) {
    return <>{renderOfflineState(isMobile)}</>;
  }
  return <div className="absolute inset-0 bg-neutral-900" />;
}
