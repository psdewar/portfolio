"use client";

import Link from "next/link";
import { useRef, type RefObject } from "react";
import {
  HandHeartIcon,
  HeadphonesIcon,
  TShirtIcon,
  BroadcastIcon,
  TicketIcon,
  type Icon,
} from "@phosphor-icons/react";
import { navItems } from "../Navbar";
import { LIVE_DESKTOP_FLEX } from "./live-breakpoint";
import { SOCIAL_LINKS } from "../components/Social";
import { LiveClips, type EnergyClipHandlers } from "./LiveClips";
import { LiveSupportAsk, type LiveSupportAskCore } from "./LiveSupportAsk";
import { Stage, type StageProps } from "./Stage";
import { PortraitChatRail, DesktopChatRail, OfflineStoryRail, StoryColumn } from "./ChatRail";
import { SUPPORT_OVERLAY_PX, STORY_MIN_PX } from "./useLiveLayout";
import { HoverTip, useHoverTip } from "./HoverTip";
import type { UseAdlibSocketResult } from "../hooks/useAdlibSocket";

function railSocialLabel(label: string) {
  return label === "X (Twitter)" ? "Twitter" : label;
}

const NAV_ICON: Record<string, Icon> = {
  "/support": HandHeartIcon,
  "/listen": HeadphonesIcon,
  "/shop": TShirtIcon,
  "/live": BroadcastIcon,
  "/rsvp": TicketIcon,
};
const NAV_RAIL_LABEL: Record<string, string> = {
  "/rsvp": "RSVP",
};
const NAV_COLOR: Record<string, string> = {
  "/support": "#d4a553",
  "/listen": "#34d399",
  "/shop": "#a78bfa",
  "/live": "#ff3b5c",
  "/rsvp": "#38bdf8",
};

function RailRow({
  icon: Icon,
  label,
  color,
  current,
  dimWhenCurrent = false,
  href,
  external = false,
  compact = false,
  expanded = false,
}: {
  icon: Icon;
  label: string;
  color: string;
  current: boolean;
  dimWhenCurrent?: boolean;
  href: string;
  external?: boolean;
  compact?: boolean;
  expanded?: boolean;
}) {
  const Tag = (external ? "a" : Link) as React.ElementType;
  const extraProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};
  const accentActive = current && !dimWhenCurrent;
  const iconColorClass = accentActive
    ? "text-[var(--row)]"
    : "text-neutral-700 dark:text-neutral-300 group-hover:text-[var(--row)]";
  const labelColorClass = accentActive
    ? "text-[var(--row)]"
    : "text-neutral-600 dark:text-neutral-400 group-hover:text-[var(--row)]";
  const bgClass = current
    ? "bg-neutral-200 dark:bg-neutral-800"
    : "group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800/60";
  const icon = <Icon size={compact ? 20 : 22} weight={accentActive ? "fill" : "regular"} />;
  return (
    <Tag
      href={href}
      {...extraProps}
      aria-current={current ? "page" : undefined}
      className="group relative block shrink-0 h-[var(--rail-row)]"
      style={{ "--row": color } as React.CSSProperties}
    >
      <span className={`absolute inset-0 ${bgClass}`} aria-hidden />
      {expanded && !compact ? (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-3">
          <span className={`h-10 w-10 grid place-items-center shrink-0 ${iconColorClass}`}>{icon}</span>
          <span className={`text-[15px] font-medium leading-none whitespace-nowrap ${labelColorClass}`}>
            {label}
          </span>
        </span>
      ) : (
        <>
          <span
            className={`absolute left-0 top-1/2 h-10 w-10 grid place-items-center ${iconColorClass}`}
            style={{
              transform: compact
                ? "translate(calc(36px - 50%), -50%)"
                : "translate(calc(36px - 50%), calc(-50% - 9px))",
            }}
          >
            {icon}
          </span>
          {!compact && (
            <span
              className={`absolute left-0 right-0 flex justify-center text-[11px] font-medium leading-none whitespace-nowrap ${labelColorClass}`}
              style={{ top: "calc(50% + 14px)" }}
            >
              {label}
            </span>
          )}
        </>
      )}
    </Tag>
  );
}

const BRAND_SWEEP_STYLE: React.CSSProperties = {
  WebkitTextFillColor: "transparent",
  backgroundImage: "linear-gradient(to right, #fb923c 0%, #ec4899 50%, currentColor 50% 100%)",
  backgroundSize: "200% 100%",
  transition: "background-position 400ms ease",
};

function BrandRow({ compact = false, expanded = false }: { compact?: boolean; expanded?: boolean }) {
  const wordmarkRef = useRef<HTMLSpanElement>(null);
  const { open, bind } = useHoverTip();
  const wordmarkColorClass = "text-neutral-700 dark:text-neutral-300";
  const spencerClass = "bg-clip-text bg-[position:100%_0%] group-hover:bg-[position:0%_0%]";
  return (
    <Link href="/" className="group relative block shrink-0 h-[var(--rail-row)]" {...bind}>
      <span className="absolute inset-0 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800/60" aria-hidden />
      {expanded ? (
        <span
          ref={wordmarkRef}
          className={`absolute left-[25px] top-1/2 -translate-y-1/2 font-bebas text-[26px] leading-none tracking-tight whitespace-nowrap text-left ${wordmarkColorClass}`}
        >
          <span>PEYT</span>{" "}
          <span className={spencerClass} style={BRAND_SWEEP_STYLE}>
            SPENCER
          </span>
        </span>
      ) : (
        <span
          ref={wordmarkRef}
          className={`absolute left-[25px] top-1/2 -translate-y-1/2 font-bebas leading-none tracking-tight whitespace-nowrap text-left ${
            compact ? "text-[14px]" : "text-[18px]"
          } ${wordmarkColorClass}`}
        >
          <span>PEYT</span>
          <br />
          <span className={spencerClass} style={BRAND_SWEEP_STYLE}>
            SPENCER
          </span>
        </span>
      )}
      <HoverTip open={open} anchorRef={wordmarkRef} label="my two first names" side="right" />
    </Link>
  );
}

export function DesktopTree({
  desktopRowRef,
  railNavExpanded,
  railRowCount,
  railNavRef,
  railCompact,
  isLive,
  usePortraitDesktopLayout,
  supportAsk,
  isDesktop,
  energyClip,
  effectiveAspect,
  portraitStageSlotRef,
  useSchemeS,
  desktopLeftColWidthPx,
  desktopStageHeightPx,
  desktopStageWidthPx,
  isShortViewport,
  handleDesktopScheduleMeasured,
  schemeSStripHeightPx,
  naturalClipsWidth,
  railMotionStyle,
  stageAspect,
  desktopStageSlotRef,
  desktopChatRailVisible,
  adlib,
  onHideChat,
  stageProps,
}: {
  desktopRowRef: RefObject<HTMLDivElement>;
  railNavExpanded: boolean;
  railRowCount: number;
  railNavRef: RefObject<HTMLElement>;
  railCompact: boolean;
  isLive: boolean;
  usePortraitDesktopLayout: boolean;
  supportAsk: LiveSupportAskCore;
  isDesktop: boolean | null;
  energyClip: EnergyClipHandlers;
  effectiveAspect: number;
  portraitStageSlotRef: RefObject<HTMLDivElement>;
  useSchemeS: boolean;
  desktopLeftColWidthPx: number | null;
  desktopStageHeightPx: number | null;
  desktopStageWidthPx: number | null;
  isShortViewport: boolean;
  handleDesktopScheduleMeasured: (px: number) => void;
  schemeSStripHeightPx: number;
  naturalClipsWidth: number;
  railMotionStyle: React.CSSProperties;
  stageAspect: number;
  desktopStageSlotRef: RefObject<HTMLDivElement>;
  desktopChatRailVisible: boolean;
  adlib: UseAdlibSocketResult;
  onHideChat: () => void;
  stageProps: Omit<StageProps, "isDesktopStage">;
}) {
  const desktopStageBox = usePortraitDesktopLayout ? null : (
    <div
      ref={desktopStageSlotRef}
      data-live-stage
      className={`relative shrink-0 overflow-hidden transition-[width,height] motion-reduce:transition-none ${
        !isLive ? "bg-[linear-gradient(#fafafa,#fafafa)] dark:bg-[linear-gradient(#000,#000)]" : ""
      }`}
      style={{
        ...railMotionStyle,
        containerType: "inline-size",
        ...(isLive ? { backgroundImage: "linear-gradient(#000, #000)" } : {}),
        ...(desktopStageWidthPx != null && desktopStageHeightPx != null
          ? { width: desktopStageWidthPx, height: desktopStageHeightPx }
          : { width: "100%", aspectRatio: stageAspect }),
      }}
    >
      <Stage {...stageProps} isDesktopStage />
    </div>
  );

  return (
    <div ref={desktopRowRef} className={`hidden ${LIVE_DESKTOP_FLEX} absolute inset-0 z-[2] bg-neutral-50 dark:bg-black`}>
        <div
          className={`relative shrink-0 h-full ${railNavExpanded ? "w-[220px]" : "w-[72px]"} flex flex-col border-r border-neutral-200 dark:border-neutral-800 overflow-hidden`}
          style={
            {
              "--rail-row": `clamp(2.25rem, calc((100dvh - var(--header-h, 0px)) / ${railRowCount}), 4rem)`,
            } as React.CSSProperties
          }
        >
          <div data-live-rail-inner className="flex-1 min-h-0 flex flex-col">
            <nav ref={railNavRef} className="flex flex-col">
              <BrandRow compact={railCompact} expanded={railNavExpanded} />
              {navItems.map((item) => (
                <RailRow
                  key={item.href}
                  icon={NAV_ICON[item.href] ?? BroadcastIcon}
                  label={NAV_RAIL_LABEL[item.href] ?? item.label}
                  color={NAV_COLOR[item.href] ?? "#737373"}
                  current={item.href === "/live"}
                  dimWhenCurrent={item.href === "/live" && !isLive}
                  href={item.href}
                  compact={railCompact}
                  expanded={railNavExpanded}
                />
              ))}
              <div className="contents opacity-80">
                {SOCIAL_LINKS.map((social) => (
                  <RailRow
                    key={social.href}
                    icon={social.icon}
                    label={railSocialLabel(social.label)}
                    color={social.color}
                    current={false}
                    href={social.href}
                    external
                    compact={railCompact}
                    expanded={railNavExpanded}
                  />
                ))}
              </div>
            </nav>
          </div>
        </div>

        {usePortraitDesktopLayout ? (
          <>
            <div
              data-live-left-col
              className="shrink-0 h-full flex flex-col"
              style={{ width: "28%", minWidth: "20rem" }}
            >
              <div data-live-schedule className="min-h-0 flex-1">
                <LiveSupportAsk
                  {...supportAsk}
                />
              </div>
              <div className="shrink-0 p-3">
                <LiveClips
                  active={isDesktop === true}
                  {...energyClip}
                />
              </div>
            </div>
            <div
              data-live-stage
              className="relative flex-1 min-w-0 h-full flex items-center justify-center bg-black overflow-hidden"
            >
              <div ref={portraitStageSlotRef} className="relative h-full bg-black" style={{ aspectRatio: effectiveAspect }}>
                <Stage {...stageProps} isDesktopStage />
              </div>
            </div>
          </>
        ) : useSchemeS ? (
          <div
            data-live-left-col
            className="min-w-0 h-full flex flex-col overflow-y-auto overflow-x-hidden"
            style={{ width: desktopLeftColWidthPx ?? "100%" }}
          >
            <div className="min-w-0 shrink-0 flex gap-3 overflow-x-auto" style={{ height: desktopStageHeightPx ?? undefined }}>
              <div data-live-schedule className="h-full bg-neutral-50 dark:bg-black" style={{ width: SUPPORT_OVERLAY_PX }}>
                <LiveSupportAsk
                  {...supportAsk}
                  pastShows={isShortViewport ? [] : supportAsk.pastShows}
                  onFirstScreenMeasured={handleDesktopScheduleMeasured}
                />
              </div>
              {desktopStageBox}
            </div>
            <div
              data-live-strip
              className="shrink-0 flex gap-3 overflow-x-auto"
              style={{ height: schemeSStripHeightPx }}
            >
              {isLive ? (
                <>
                  <div className="h-full shrink-0" style={{ width: naturalClipsWidth }}>
                    <LiveClips
                      active={isDesktop === true}
                      {...energyClip}
                      fitHeight
                      className="h-full w-full py-3"
                    />
                  </div>
                  <div className="h-full flex-1 overflow-y-auto" style={{ minWidth: STORY_MIN_PX }}>
                    <StoryColumn />
                  </div>
                </>
              ) : (
                <LiveClips
                  active={isDesktop === true}
                  {...energyClip}
                  fitHeight
                  className="h-full w-full py-3"
                />
              )}
            </div>
          </div>
        ) : (
          <div
            data-live-left-col
            className="min-w-0 h-full flex flex-col overflow-y-auto overflow-x-hidden"
            style={{ width: desktopLeftColWidthPx ?? "100%" }}
          >
            {desktopStageBox}

            <div
              data-live-support-area
              data-live-strip
              className="min-w-0 flex-1 min-h-0 flex gap-3 overflow-x-auto"
            >
              <div
                data-live-schedule
                className="shrink-0 h-full bg-neutral-50 dark:bg-black"
                style={{ width: SUPPORT_OVERLAY_PX }}
              >
                <LiveSupportAsk
                  {...supportAsk}
                  pastShows={isShortViewport ? [] : supportAsk.pastShows}
                  onFirstScreenMeasured={handleDesktopScheduleMeasured}
                />
              </div>
              {isLive ? (
                <div className="h-full flex-1 min-w-0 flex gap-3 overflow-x-auto">
                  <div className="h-full shrink-0" style={{ width: naturalClipsWidth }}>
                    <LiveClips
                      active={isDesktop === true}
                      {...energyClip}
                      fitHeight
                      className="h-full w-full py-3"
                    />
                  </div>
                  <div className="h-full flex-1 overflow-y-auto" style={{ minWidth: STORY_MIN_PX }}>
                    <StoryColumn />
                  </div>
                </div>
              ) : (
                <div className="h-full flex-1 min-w-0 overflow-x-auto">
                  <LiveClips
                    active={isDesktop === true}
                    {...energyClip}
                    fitHeight
                    className="h-full w-full py-3"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {isDesktop === true && usePortraitDesktopLayout && <PortraitChatRail adlib={adlib} />}

        {isDesktop === true && !usePortraitDesktopLayout && desktopChatRailVisible && (
          <DesktopChatRail adlib={adlib} onHideChat={onHideChat} />
        )}

        {isDesktop === true && !usePortraitDesktopLayout && !isLive && <OfflineStoryRail />}
      </div>
  );
}
