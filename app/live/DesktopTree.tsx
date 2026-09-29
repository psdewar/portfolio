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
import { DesktopChatRail, OfflineStoryRail, StoryColumn } from "./ChatRail";
import { SUPPORT_OVERLAY_PX, RAIL_ROW_COMPACT_HEIGHT_PX, DESKTOP_STAGE_ASPECT } from "./useLiveLayout";
import { LiveBand } from "./LiveBand";
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
  const iconRef = useRef<HTMLSpanElement>(null);
  const { open, bind } = useHoverTip();
  const compactTipProps = compact ? bind : {};
  return (
    <Tag
      href={href}
      {...extraProps}
      {...compactTipProps}
      aria-current={current ? "page" : undefined}
      aria-label={compact ? label : undefined}
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
            ref={iconRef}
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
      {compact && <HoverTip open={open} anchorRef={iconRef} label={label} side="right" />}
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
    <Link
      href="/"
      className="group relative block shrink-0 h-[var(--rail-row)]"
      aria-label={compact ? "Home" : undefined}
      {...bind}
    >
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
      ) : compact ? (
        <span
          ref={wordmarkRef}
          className={`absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-bebas leading-none tracking-tight text-[32px] ${wordmarkColorClass}`}
        >
          PS
        </span>
      ) : (
        <span
          ref={wordmarkRef}
          className={`absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-bebas leading-none tracking-tight whitespace-nowrap text-[18px] ${wordmarkColorClass}`}
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
  supportAsk,
  isDesktop,
  energyClip,
  useSchemeS,
  desktopLeftColWidthPx,
  desktopStageHeightPx,
  desktopStageWidthPx,
  isShortViewport,
  handleDesktopScheduleMeasured,
  handleBandFloorMeasured,
  schemeSStripHeightPx,
  naturalClipsWidth,
  railMotionStyle,
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
  supportAsk: LiveSupportAskCore;
  isDesktop: boolean | null;
  energyClip: EnergyClipHandlers;
  useSchemeS: boolean;
  desktopLeftColWidthPx: number | null;
  desktopStageHeightPx: number | null;
  desktopStageWidthPx: number | null;
  isShortViewport: boolean;
  handleDesktopScheduleMeasured: (px: number) => void;
  handleBandFloorMeasured: (px: number) => void;
  schemeSStripHeightPx: number;
  naturalClipsWidth: number;
  railMotionStyle: React.CSSProperties;
  desktopStageSlotRef: RefObject<HTMLDivElement>;
  desktopChatRailVisible: boolean;
  adlib: UseAdlibSocketResult;
  onHideChat: () => void;
  stageProps: Omit<StageProps, "isDesktopStage">;
}) {
  const desktopStageBox = (
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
          : { width: "100%", aspectRatio: DESKTOP_STAGE_ASPECT }),
      }}
    >
      <Stage {...stageProps} isDesktopStage />
    </div>
  );

  return (
    <div ref={desktopRowRef} className={`hidden ${LIVE_DESKTOP_FLEX} absolute inset-0 z-[2] bg-neutral-50 dark:bg-black`}>
        <div
          className={`relative shrink-0 h-full ${railNavExpanded ? "w-[220px]" : "w-[72px]"} flex flex-col border-r border-neutral-200 dark:border-neutral-800 overflow-y-auto overflow-x-hidden scrollbar-hide`}
          style={
            {
              "--rail-row": railCompact
                ? `${RAIL_ROW_COMPACT_HEIGHT_PX}px`
                : `clamp(2.25rem, calc((100dvh - var(--header-h, 0px)) / ${railRowCount}), 4rem)`,
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

        {useSchemeS ? (
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
                  <div className="h-full flex-1 min-w-0 overflow-y-auto">
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

            {isLive ? (
              <LiveBand
                supportAsk={supportAsk}
                energyClip={energyClip}
                isDesktop={isDesktop}
                isShortViewport={isShortViewport}
                onFirstScreenMeasured={handleDesktopScheduleMeasured}
                onBandFloorMeasured={handleBandFloorMeasured}
              />
            ) : (
              <div
                data-live-support-area
                data-live-strip
                className="min-w-0 flex gap-3 flex-1 min-h-0 overflow-x-auto"
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
                    onBandFloorMeasured={handleBandFloorMeasured}
                  />
                </div>
                <div className="h-full flex-1 min-w-0 overflow-x-auto">
                  <LiveClips
                    active={isDesktop === true}
                    {...energyClip}
                    fitHeight
                    className="h-full w-full py-3"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {isDesktop === true && desktopChatRailVisible && (
          <DesktopChatRail adlib={adlib} onHideChat={onHideChat} />
        )}

        {isDesktop === true && !isLive && <OfflineStoryRail />}
      </div>
  );
}
