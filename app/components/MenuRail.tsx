"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType, type CSSProperties, type MouseEvent, type RefObject } from "react";
import { ArrowUpRightIcon, BroadcastIcon, type IconWeight } from "@phosphor-icons/react";
import { FEATURE_LINK } from "../lib/socials";
import { NAV_ICON, NAV_COLOR } from "../Navbar";
import BrandWordmark from "./BrandWordmark";
import { MenuButton, type MenuControl } from "../live/MenuButton";
import {
  RAIL_ROW_COMPACT_HEIGHT_PX,
  MENU_PANEL_WIDTH_PX,
  MENU_NAV_ITEMS,
} from "../live/useLiveLayout";
import { MENU_HEADER_PX } from "../live/live-breakpoint";

const RAIL_LABEL_CLASS = "absolute left-[48px] top-1/2 -translate-y-1/2 text-[18px] font-medium leading-none whitespace-nowrap";
const RAIL_ICON_STYLE: CSSProperties = { transform: "translate(calc(24px - 50%), -50%)" };
const RAIL_ICON_CLASS = "absolute left-0 top-1/2 h-10 w-10 grid place-items-center";

type RailIcon = ComponentType<{ size?: number | string; weight?: IconWeight }>;

export function RailRow({
  icon: Icon,
  label,
  color,
  href,
  compact = false,
  external = false,
  active = false,
}: {
  icon: RailIcon;
  label: string;
  color: string;
  href: string;
  compact?: boolean;
  external?: boolean;
  active?: boolean;
}) {
  const className = "group relative block shrink-0 h-[var(--rail-row)]";
  const style = { "--row": color } as CSSProperties;
  const content = (
    <>
      <span
        className={`absolute inset-0 group-hover:bg-neutral-100 dark:group-hover:bg-neutral-800/60 ${
          active ? "bg-neutral-100 dark:bg-neutral-800/60" : ""
        }`}
        aria-hidden
      />
      <span
        className={`${RAIL_ICON_CLASS} ${active ? "text-[var(--row)]" : "text-neutral-700 dark:text-neutral-300"} group-hover:text-[var(--row)]`}
        style={RAIL_ICON_STYLE}
      >
        <Icon size={compact ? 20 : 24} weight="regular" />
      </span>
      <span
        aria-hidden
        className={`${RAIL_LABEL_CLASS} ${active ? "text-[var(--row)] font-semibold" : "text-neutral-600 dark:text-neutral-400"} group-hover:text-[var(--row)]`}
      >
        {label}
      </span>
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`} className={className} style={style}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} aria-label={label} aria-current={active ? "page" : undefined} className={className} style={style}>
      {content}
    </Link>
  );
}

function BrandMark() {
  return (
    <Link
      href="/"
      aria-label="Home"
      className="group flex h-full items-center font-bebas text-[26px] leading-none tracking-tight whitespace-nowrap"
    >
      <span className="translate-y-[1.5px]">
        <BrandWordmark />
      </span>
    </Link>
  );
}

export function railRowHeight(railCompact: boolean, railRowCount: number) {
  return railCompact
    ? `${RAIL_ROW_COMPACT_HEIGHT_PX}px`
    : `clamp(2.75rem, calc((100dvh - ${MENU_HEADER_PX}px) / ${railRowCount}), ${MENU_HEADER_PX}px)`;
}

// Open/close state for the slide-out rail: outside click and Escape close it, and focus
// moves into the panel on open and back to the menu button on close.
export function useRailMenu(scopeRef: RefObject<HTMLElement>) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuPanelRef = useRef<HTMLDivElement>(null);

  const focusMenuButton = () =>
    scopeRef.current?.querySelector<HTMLElement>("[data-live-menu-button]:not([data-live-menu-panel] *)")?.focus();

  const closeMenu = () => {
    setMenuOpen(false);
    focusMenuButton();
  };
  const menuControl: MenuControl = { open: menuOpen, onToggle: () => (menuOpen ? closeMenu() : setMenuOpen(true)) };

  useEffect(() => {
    if (!menuOpen) return;
    const focusTimer = setTimeout(() => menuPanelRef.current?.querySelector("a")?.focus(), 50);
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if ((target as HTMLElement).closest?.("[data-live-menu-panel], [data-live-menu-button]")) return;
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

  const closeMenuOnLink = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest("a")) closeMenu();
  };

  return { menuOpen, menuPanelRef, menuControl, closeMenuOnLink };
}

export function MenuRailPanel({
  open,
  panelRef,
  menuControl,
  onNavClick,
  position,
  railRowCount,
  railCompact,
  railNavRef,
}: {
  open: boolean;
  panelRef: RefObject<HTMLDivElement>;
  menuControl: MenuControl;
  onNavClick: (e: MouseEvent) => void;
  position: "fixed" | "absolute";
  railRowCount: number;
  railCompact: boolean;
  railNavRef?: RefObject<HTMLElement>;
}) {
  const pathname = usePathname() ?? "";
  // The X and wordmark sit on a static layer so they never move; their black band slides in with the panel.
  return (
    <>
    <div
      data-live-menu-panel
      className={`${position} left-0 top-0 z-[51] flex items-center gap-0.5 pl-0.5 pr-2 transition-[visibility] duration-150 motion-reduce:transition-none text-white ${
        open ? "visible" : "invisible"
      }`}
      style={{ width: MENU_PANEL_WIDTH_PX, height: MENU_HEADER_PX }}
    >
      <MenuButton {...menuControl} className="!h-full !w-11 !text-inherit" />
      <BrandMark />
    </div>
    <div
      ref={panelRef}
      data-live-menu-panel
      className={`${position} inset-y-0 left-0 z-50 flex flex-col overflow-hidden bg-neutral-50 dark:bg-black border-r border-neutral-200 dark:border-neutral-800 transition-[transform,visibility,box-shadow] duration-150 ease-out motion-reduce:transition-none ${
        open
          ? "translate-x-0 visible shadow-[8px_0_24px_-12px_rgba(0,0,0,0.35)] dark:shadow-[8px_0_24px_-12px_rgba(0,0,0,0.9)]"
          : "-translate-x-full invisible"
      }`}
      style={
        {
          width: MENU_PANEL_WIDTH_PX,
          "--rail-row": railRowHeight(railCompact, railRowCount),
        } as CSSProperties
      }
    >
      <div aria-hidden className="shrink-0 bg-black border-b border-neutral-800" style={{ height: MENU_HEADER_PX }} />
      <div
        data-live-menu-inner
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide"
        onClick={onNavClick}
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
              active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
            />
          ))}
          <RailRow
            icon={ArrowUpRightIcon}
            label={FEATURE_LINK.label}
            color={FEATURE_LINK.color}
            href={FEATURE_LINK.href}
            compact={railCompact}
            external
          />
        </nav>
      </div>
    </div>
    </>
  );
}
