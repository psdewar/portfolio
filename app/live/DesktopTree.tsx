"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import { BroadcastIcon, type Icon } from "@phosphor-icons/react";
import { NAV_ICON, NAV_COLOR, BRAND_SWEEP_STYLE } from "../Navbar";
import { LIVE_DESKTOP_FLEX } from "./live-breakpoint";
import { SOCIAL_LINKS } from "../components/Social";
import { LiveClips, type EnergyClipHandlers } from "./LiveClips";
import { LiveSupportAsk, type LiveSupportAskCore } from "./LiveSupportAsk";
import { Stage, type StageProps } from "./Stage";
import { DesktopChatRail } from "./ChatRail";
import {
  RAIL_ROW_COMPACT_HEIGHT_PX,
  DESKTOP_STAGE_ASPECT,
  OFFLINE_STAGE_ASPECT,
  CLIP_WRAPPER_MIN_PX,
  MENU_PANEL_WIDTH_PX,
  MENU_HEADER_PX,
  MENU_SOCIAL_PX,
  MENU_NAV_ITEMS,
} from "./useLiveLayout";
import { MenuButton, MenuBrand } from "./MenuButton";
import type { UseAdlibSocketResult } from "../hooks/useAdlibSocket";

function railSocialLabel(label: string) {
  return label === "X (Twitter)" ? "Twitter" : label;
}

const RAIL_LABEL_CLASS = "absolute left-[64px] top-1/2 -translate-y-1/2 text-[15px] font-medium leading-none whitespace-nowrap";
const RAIL_ICON_STYLE: React.CSSProperties = { transform: "translate(calc(36px - 50%), -50%)" };
const RAIL_ICON_CLASS = "absolute left-0 top-1/2 h-10 w-10 grid place-items-center";

function RailRow({
  icon: Icon,
  label,
  color,
  href,
  compact = false,
}: {
  icon: Icon;
  label: string;
  color: string;
  href: string;
  compact?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="group relative block shrink-0 h-[var(--rail-row)]"
      style={{ "--row": color } as React.CSSProperties}
    >
      <span className="absolute inset-0 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800/60" aria-hidden />
      <span
        className={`${RAIL_ICON_CLASS} text-neutral-700 dark:text-neutral-300 group-hover:text-[var(--row)]`}
        style={RAIL_ICON_STYLE}
      >
        <Icon size={compact ? 20 : 22} weight="regular" />
      </span>
      <span
        aria-hidden
        className={`${RAIL_LABEL_CLASS} text-neutral-600 dark:text-neutral-400 group-hover:text-[var(--row)]`}
      >
        {label}
      </span>
    </Link>
  );
}

function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="Home"
      className="group flex h-10 items-center font-bebas text-[26px] leading-none tracking-tight whitespace-nowrap text-neutral-700 dark:text-neutral-300"
    >
      <span>PEYT</span>
      <span aria-hidden>&nbsp;</span>
      <span
        className="bg-clip-text bg-[position:100%_0%] group-hover:bg-[position:0%_0%]"
        style={BRAND_SWEEP_STYLE}
      >
        SPENCER
      </span>
    </Link>
  );
}

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  const focusMenuButton = () =>
    desktopRowRef.current?.querySelector<HTMLElement>("[data-live-menu-button]:not([data-live-menu-panel] *)")?.focus();

  const closeMenu = () => {
    setMenuOpen(false);
    focusMenuButton();
  };
  const menuControl = { open: menuOpen, onToggle: () => (menuOpen ? closeMenu() : setMenuOpen(true)) };

  useEffect(() => {
    if (!menuOpen) return;
    const focusTimer = setTimeout(() => menuPanelRef.current?.querySelector("a")?.focus(), 50);
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuPanelRef.current?.contains(target) || (target as HTMLElement).closest?.("[data-live-menu-button]")) return;
      setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        focusMenuButton();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const closeMenuOnLink = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) closeMenu();
  };

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
      <Stage {...stageProps} isDesktopStage menuBlock={<MenuBrand {...menuControl} tone={isLive ? "video" : "marquee"} />} />
    </div>
  );

  return (
    <div
      ref={desktopRowRef}
      className={`hidden ${LIVE_DESKTOP_FLEX} ${
        docScroll ? "relative min-h-[100dvh]" : "absolute inset-0 z-[2]"
      } bg-neutral-50 dark:bg-black`}
    >
        <div
          ref={menuPanelRef}
          data-live-menu-panel
          className={`${docScroll ? "fixed" : "absolute"} inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-neutral-50 dark:bg-black border-r border-neutral-200 dark:border-neutral-800 transition-[transform,visibility,box-shadow] duration-150 ease-out motion-reduce:transition-none ${
            menuOpen
              ? "translate-x-0 visible shadow-[8px_0_24px_-12px_rgba(0,0,0,0.35)] dark:shadow-[8px_0_24px_-12px_rgba(0,0,0,0.9)]"
              : "-translate-x-full invisible"
          }`}
          style={
            {
              width: MENU_PANEL_WIDTH_PX,
              "--rail-row": railCompact
                ? `${RAIL_ROW_COMPACT_HEIGHT_PX}px`
                : `clamp(2.25rem, calc((100dvh - var(--header-h, 0px) - ${MENU_HEADER_PX}px - ${MENU_SOCIAL_PX}px) / ${railRowCount}), 4rem)`,
            } as React.CSSProperties
          }
        >
          <div
            className="shrink-0 flex items-center gap-2 border-b border-neutral-200 px-2 dark:border-neutral-800"
            style={{ height: MENU_HEADER_PX }}
          >
            <MenuButton {...menuControl} />
            <BrandMark />
          </div>
          <div
            data-live-menu-inner
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide"
            onClick={closeMenuOnLink}
          >
            <nav ref={railNavRef} className="flex flex-col">
              {MENU_NAV_ITEMS.map((item) => (
                <RailRow
                  key={item.href}
                  icon={NAV_ICON[item.href] ?? BroadcastIcon}
                  label={item.label}
                  color={NAV_COLOR[item.href] ?? "#737373"}
                  href={item.href}
                  compact={railCompact}
                />
              ))}
            </nav>
          </div>
          <div
            className="shrink-0 flex items-center justify-between border-t border-neutral-200 px-2 dark:border-neutral-800"
            style={{ height: MENU_SOCIAL_PX }}
          >
            {SOCIAL_LINKS.map((social) => (
              <a
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={railSocialLabel(social.label)}
                className="grid h-11 w-11 place-items-center rounded-full text-neutral-600 transition hover:bg-neutral-200 hover:text-[var(--row)] active:scale-95 active:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:active:bg-neutral-800"
                style={{ "--row": social.color } as React.CSSProperties}
              >
                <social.icon size={24} />
              </a>
            ))}
          </div>
        </div>

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
                    className="h-full w-full px-4 py-3"
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
