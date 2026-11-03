"use client";

import { type RefObject } from "react";
import { LIVE_DESKTOP_FLEX } from "./live-breakpoint";
import { MenuRailPanel, useRailMenu } from "../components/MenuRail";
import { LiveClips, type EnergyClipHandlers } from "./LiveClips";
import { LiveSupportAsk, type LiveSupportAskCore } from "./LiveSupportAsk";
import { Stage, type StageProps } from "./Stage";
import { DesktopChatRail } from "./ChatRail";
import { DESKTOP_STAGE_ASPECT, OFFLINE_STAGE_ASPECT, CLIP_WRAPPER_MIN_PX } from "./useLiveLayout";
import { MenuBrand } from "./MenuButton";
import type { UseAdlibSocketResult } from "../hooks/useAdlibSocket";

export function DesktopTree({
  desktopRowRef,
  railRowCount,
  liveStripColumns,
  liveStripRowPx,
  railNavRef,
  railCompact,
  isLive,
  supportAsk,
  isDesktop,
  energyClip,
  docScroll,
  desktopLeftColWidthPx,
  desktopStageHeightPx,
  desktopStageWidthPx,
  railMotionStyle,
  desktopStageSlotRef,
  desktopChatRailVisible,
  adlib,
  onHideChat,
  onOpenSupport,
  stageProps,
}: {
  desktopRowRef: RefObject<HTMLDivElement>;
  railRowCount: number;
  liveStripColumns: number;
  liveStripRowPx: number | null;
  railNavRef: RefObject<HTMLElement>;
  railCompact: boolean;
  isLive: boolean;
  supportAsk: LiveSupportAskCore;
  isDesktop: boolean | null;
  energyClip: EnergyClipHandlers;
  docScroll: boolean;
  desktopLeftColWidthPx: number | null;
  desktopStageHeightPx: number | null;
  desktopStageWidthPx: number | null;
  railMotionStyle: React.CSSProperties;
  desktopStageSlotRef: RefObject<HTMLDivElement>;
  desktopChatRailVisible: boolean;
  adlib: UseAdlibSocketResult;
  onHideChat: () => void;
  onOpenSupport: () => void;
  stageProps: Omit<StageProps, "isDesktopStage">;
}) {
  const { menuOpen, menuPanelRef, menuControl, closeMenuOnLink } = useRailMenu(desktopRowRef);

  const desktopStageBox = (
    <div
      ref={desktopStageSlotRef}
      data-live-stage
      className={`relative shrink-0 overflow-hidden transition-[width,height] motion-reduce:transition-none ${
        !isLive
          ? `bg-[linear-gradient(#fafafa,#fafafa)] dark:bg-[linear-gradient(#000,#000)] ${docScroll ? "sticky top-0 self-start" : ""}`
          : ""
      }`}
      style={{
        ...railMotionStyle,
        containerType: "inline-size",
        ...(isLive ? { backgroundImage: "linear-gradient(#000, #000)" } : {}),
        ...(isLive
          ? desktopStageHeightPx != null
            ? { width: "100%", height: desktopStageHeightPx }
            : { width: "100%", aspectRatio: DESKTOP_STAGE_ASPECT }
          : desktopStageWidthPx != null && desktopStageHeightPx != null
            ? { width: desktopStageWidthPx, height: desktopStageHeightPx }
            : { height: "100dvh", aspectRatio: OFFLINE_STAGE_ASPECT }),
      }}
    >
      <Stage {...stageProps} isDesktopStage menuBlock={<MenuBrand {...menuControl} />} />
    </div>
  );

  return (
    <div
      ref={desktopRowRef}
      className={`hidden ${LIVE_DESKTOP_FLEX} ${
        docScroll ? "relative min-h-[100dvh]" : "absolute inset-0 z-[2]"
      } bg-neutral-50 dark:bg-black`}
    >
        <MenuRailPanel
          open={menuOpen}
          panelRef={menuPanelRef}
          menuControl={menuControl}
          onNavClick={closeMenuOnLink}
          position={docScroll ? "fixed" : "absolute"}
          railRowCount={railRowCount}
          railCompact={railCompact}
          railNavRef={railNavRef}
        />

        {isLive ? (
          <div
            data-live-left-col
            className="min-w-0 h-full flex flex-col overflow-hidden bg-black"
            style={{ width: desktopLeftColWidthPx ?? "100%" }}
          >
            {desktopStageBox}
            <div data-live-strip className="min-h-0 flex-1 overflow-hidden bg-black">
              <LiveSupportAsk
                {...supportAsk}
                variant="strip"
                stripColumns={liveStripColumns}
                stripRowPx={liveStripRowPx}
                tone="dark"
              />
            </div>
          </div>
        ) : (
          <>
            {desktopStageBox}
            <div
              data-live-secondary
              className={`relative z-10 flex min-w-0 flex-1 flex-col bg-neutral-50 dark:bg-black ${
                docScroll ? "" : "h-full overflow-hidden"
              }`}
            >
              <LiveSupportAsk
                {...supportAsk}
                variant="side"
              />
              <div data-live-strip className="relative min-h-0 flex-1" style={{ minHeight: CLIP_WRAPPER_MIN_PX }}>
                <div className="absolute inset-0 overflow-x-auto">
                  <LiveClips
                    active={isDesktop === true}
                    {...energyClip}
                    fitHeight
                    inset={16}
                    underLeft
                    className="h-full w-full py-3"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {isDesktop === true && desktopChatRailVisible && (
          <DesktopChatRail
            adlib={adlib}
            onHideChat={onHideChat}
            onOpenSupport={onOpenSupport}
          />
        )}
      </div>
  );
}
