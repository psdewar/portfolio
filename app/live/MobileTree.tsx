"use client";

import type { RefObject } from "react";
import { AdlibChat } from "../components/AdlibChat";
import { AdlibChatOverlay } from "../components/AdlibChatOverlay";
import { AdlibReactionButtons } from "../components/AdlibReactions";
import type { UseAdlibSocketResult } from "../hooks/useAdlibSocket";
import { LiveClips, type EnergyClipHandlers } from "./LiveClips";
import { LiveSupportAsk, fundButtonClass, type LiveSupportAskCore } from "./LiveSupportAsk";
import { Stage, type StageProps } from "./Stage";
import { StoryColumn } from "./ChatRail";
import { PHOTO_NAT_W, PHOTO_NAT_H, CLIP_WRAPPER_MIN_PX } from "./useLiveLayout";
import { LIVE_DESKTOP_HIDDEN } from "./live-breakpoint";

export function MobileTree({
  mobileColRef,
  mobileStageSlotRef,
  isLive,
  isOgMode,
  isDesktop,
  mobileOfflineScroll,
  mobileStageHeightPx,
  mobileLandscape,
  mobilePanelChat,
  stageAspect,
  supportAsk,
  handleMobileScheduleMeasured,
  energyClip,
  adlib,
  stageProps,
}: {
  mobileColRef: RefObject<HTMLDivElement>;
  mobileStageSlotRef: RefObject<HTMLDivElement>;
  isLive: boolean;
  isOgMode: boolean;
  isDesktop: boolean | null;
  mobileOfflineScroll: boolean;
  mobileStageHeightPx: number | null;
  mobileLandscape: boolean;
  mobilePanelChat: boolean;
  stageAspect: number;
  supportAsk: LiveSupportAskCore;
  handleMobileScheduleMeasured: (px: number) => void;
  energyClip: EnergyClipHandlers;
  adlib: UseAdlibSocketResult;
  stageProps: Omit<StageProps, "isDesktopStage">;
}) {
  const { onOpenSupport } = supportAsk;
  const overlayChat = !mobilePanelChat && (mobileLandscape || stageAspect < 1);
  const fundMyTourButton = (
    <div className="-mx-1 shrink-0 px-2 pb-0.5 pt-1">
      <button type="button" onClick={onOpenSupport} className={fundButtonClass()}>
        Fund My Tour
      </button>
    </div>
  );
  const mobileAdlibChat = (
    <AdlibChat
      socket={adlib}
      reactionsBar={
        <>
          <AdlibReactionButtons onReact={adlib.react} variant="panel" />
          {fundMyTourButton}
        </>
      }
    />
  );
  const showChatOverlay = isDesktop === false && !isOgMode && isLive && overlayChat;
  const chatPane =
    isDesktop === false && !isOgMode && isLive && !overlayChat && (
      <div className="min-h-0 flex-1">{mobileAdlibChat}</div>
    );
  const offlineMobileContent = !isLive && !isOgMode && (
    <div data-live-schedule>
      <LiveSupportAsk
        {...supportAsk}
        variant="sheet"
        onFirstScreenMeasured={handleMobileScheduleMeasured}
      >
        <div className="p-3" style={{ height: CLIP_WRAPPER_MIN_PX }}>
          <LiveClips
            active={isDesktop === false}
            {...energyClip}
            fitHeight
            className="h-full w-full"
          />
        </div>
        <div>
          <StoryColumn />
        </div>
      </LiveSupportAsk>
    </div>
  );

  return (
    <div
      ref={mobileColRef}
      className={`${LIVE_DESKTOP_HIDDEN} ${
        mobileOfflineScroll ? "relative w-full" : "absolute inset-0"
      } flex flex-col z-[2] ${isLive ? "bg-black" : "bg-neutral-50 dark:bg-black"}`}
    >
      <div
        ref={mobileStageSlotRef}
        data-live-stage
        className={`relative w-full shrink-0 overflow-hidden ${
          !isLive ? "bg-[linear-gradient(#fafafa,#fafafa)] dark:bg-[linear-gradient(#000,#000)]" : "bg-black"
        }`}
        style={
          !isLive
            ? mobileStageHeightPx != null
              ? { height: mobileStageHeightPx }
              : { aspectRatio: `${PHOTO_NAT_W} / ${PHOTO_NAT_H}` }
            : {
                height:
                  overlayChat && !mobileLandscape
                    ? `calc(100dvh - var(--header-h, 56px))`
                    : `min(${100 / stageAspect}vw, calc(100dvh - var(--header-h, 56px)))`,
              }
        }
      >
        <Stage {...stageProps} isDesktopStage={false} />
        {showChatOverlay && <AdlibChatOverlay socket={adlib} onOpenSupport={onOpenSupport} />}
      </div>
      {offlineMobileContent ? (
        mobileOfflineScroll ? (
          offlineMobileContent
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{offlineMobileContent}</div>
        )
      ) : (
        chatPane
      )}
    </div>
  );
}
