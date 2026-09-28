"use client";

import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import Image from "next/image";
import type { PostHog } from "posthog-js";
import {
  BellIcon,
  SpeakerSlashIcon,
  PlayIcon,
  CornersOutIcon,
  ShareNetworkIcon,
} from "@phosphor-icons/react";
import { AdlibReactions } from "../components/AdlibReactions";
import type { StayConnectedPurpose } from "../components/StayConnected";
import type { UsePlayerResult } from "./player";
import type { UseAdlibSocketResult } from "../hooks/useAdlibSocket";
import { HoverTip, useHoverTip } from "./HoverTip";

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
  const anchorRef = useRef<HTMLButtonElement>(null);
  const { open, bind } = useHoverTip();
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={onShowChat}
        aria-label="Show chat"
        aria-expanded={false}
        className="p-2.5 flex items-center justify-center text-white hover:opacity-70 transition-opacity"
        {...bind}
      >
        {chatToggleIcon(true, true)}
      </button>
      <HoverTip open={open} anchorRef={anchorRef} label="Expand" side="left" />
    </>
  );
}

export function useStageVideo({
  isLive,
  isDesktop,
  usePortraitDesktopLayout,
  isDemo,
  videoRef,
}: {
  isLive: boolean;
  isDesktop: boolean | null;
  usePortraitDesktopLayout: boolean;
  isDemo: boolean;
  videoRef: RefObject<HTMLVideoElement>;
}) {
  const desktopStageSlotRef = useRef<HTMLDivElement | null>(null);
  const portraitStageSlotRef = useRef<HTMLDivElement | null>(null);
  const mobileStageSlotRef = useRef<HTMLDivElement | null>(null);
  const [videoHome, setVideoHome] = useState<HTMLDivElement | null>(null);
  const [stageVideoSlot, setStageVideoSlot] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    let next: HTMLDivElement | null = null;
    if (isLive) {
      if (isDesktop === true) {
        next = usePortraitDesktopLayout ? portraitStageSlotRef.current : desktopStageSlotRef.current;
      } else if (isDesktop === false) {
        next = mobileStageSlotRef.current;
      }
    }
    setStageVideoSlot((prev) => (prev === next ? prev : next));
  });
  const stageVideo = (videoHome || stageVideoSlot) && createPortal(
    <video
      ref={videoRef}
      className={
        isDemo
          ? "absolute inset-0 h-full w-full opacity-0 pointer-events-none"
          : "absolute inset-0 h-full w-full object-contain bg-neutral-900"
      }
      playsInline
      aria-hidden={isDemo || undefined}
    />,
    stageVideoSlot ?? (videoHome as HTMLDivElement),
  );

  return { desktopStageSlotRef, portraitStageSlotRef, mobileStageSlotRef, setVideoHome, stageVideo };
}

export interface StageProps {
  isDesktopStage: boolean;
  isDemo: boolean;
  demoOrientation: "portrait" | "landscape" | null;
  isLive: boolean;
  isDesktop: boolean | null;
  usePortraitDesktopLayout: boolean;
  mobileLandscape: boolean;
  player: UsePlayerResult;
  adlib: Pick<UseAdlibSocketResult, "floatingReactions" | "react">;
  elapsedTime: string;
  isPatron: boolean;
  notifyPurpose: StayConnectedPurpose | null;
  setNotifyPurpose: Dispatch<SetStateAction<StayConnectedPurpose | null>>;
  chatCollapsed: boolean;
  onShowChat: () => void;
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
  usePortraitDesktopLayout,
  mobileLandscape,
  player,
  adlib,
  elapsedTime,
  isPatron,
  notifyPurpose,
  setNotifyPurpose,
  chatCollapsed,
  onShowChat,
  showToast,
  posthog,
  nextStream,
  desktopPhotoFit,
  mobilePhotoFit,
  mobileStageConstrained,
  stageNarrow,
}: StageProps) {
  const isMobile = !isDesktopStage;

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

  const renderShowChatButton = (mobile: boolean) =>
    isLive && !mobile && !usePortraitDesktopLayout && chatCollapsed ? (
      <ShowChatButton onShowChat={onShowChat} />
    ) : null;

  const renderVideoOverlay = (mobile: boolean) => (
    <>
      <div className={`absolute top-0 inset-x-0 z-30 ${mobile ? "p-3" : "p-4"}`}>
        <div className="flex items-start justify-between">
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
              {!mobile && (
                <>
                  <button
                    onClick={handleShare}
                    aria-label="Share"
                    className="min-h-11 min-w-11 flex items-center justify-center bg-black/40 text-white rounded-full hover:bg-black/60"
                  >
                    <ShareNetworkIcon size={16} weight="fill" />
                  </button>
                  <button
                    onClick={handleFullscreen}
                    aria-label="Fullscreen"
                    className="min-h-11 min-w-11 flex items-center justify-center bg-black/40 text-white rounded-full hover:bg-black/60"
                  >
                    <CornersOutIcon size={16} weight="bold" />
                  </button>
                </>
              )}
              {renderShowChatButton(mobile)}
            </div>
            {mobile && (
              <div className="flex flex-col gap-4">
                {!isPatron && (
                  <button
                    onClick={() => setNotifyPurpose((p) => (p ? null : "notify"))}
                    aria-label="Notify me by email"
                    className="min-h-11 min-w-11 flex items-center justify-center -m-1.5"
                  >
                    <BellIcon
                      size={32}
                      weight="duotone"
                      className={`drop-shadow-lg ${notifyPurpose ? "text-blue-400" : "text-white"}`}
                    />
                  </button>
                )}
                <button
                  onClick={handleShare}
                  aria-label="Share"
                  className="min-h-11 min-w-11 flex items-center justify-center -m-1.5"
                >
                  <ShareNetworkIcon size={32} weight="duotone" className="text-white drop-shadow-lg" />
                </button>
                <button
                  onClick={handleFullscreen}
                  aria-label="Fullscreen"
                  className="min-h-11 min-w-11 flex items-center justify-center -m-1.5"
                >
                  <CornersOutIcon size={32} weight="duotone" className="text-white drop-shadow-lg" />
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
        >
          <div className="absolute top-14 left-3 p-2 rounded-full bg-black/50 backdrop-blur">
            <SpeakerSlashIcon size={20} weight="fill" className="text-white" />
          </div>
        </button>
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
        <div className="absolute inset-0 bg-neutral-800" aria-hidden />
        <span
          className="absolute top-3 left-3 z-10 text-xs uppercase tracking-widest text-neutral-500"
          aria-hidden
        >
          {demoOrientation} demo
        </span>
        {renderVideoOverlay(isMobile)}
        <AdlibReactions
          floating={adlib.floatingReactions}
          onReact={adlib.react}
          hideButtons={isDesktopStage || !mobileLandscape}
        />
      </>
    );
  }
  if (isLive && isDesktop === isDesktopStage) {
    return (
      <>
        <div className="absolute inset-0 z-[5]" />
        {renderVideoOverlay(isMobile)}
        <AdlibReactions
          floating={adlib.floatingReactions}
          onReact={adlib.react}
          hideButtons={isDesktopStage || !mobileLandscape}
        />
      </>
    );
  }
  if (!isLive) {
    return <>{renderOfflineState(isMobile)}</>;
  }
  return <div className="absolute inset-0 bg-neutral-900" />;
}
