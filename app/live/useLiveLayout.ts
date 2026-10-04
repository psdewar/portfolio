"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useVisualViewportHeight } from "../hooks/useVisualViewportHeight";
import { CLIP_MIN_H } from "../components/EnergyVideos";
import { navItems } from "../Navbar";
import { LIVE_DESKTOP_MEDIA_QUERY } from "./live-breakpoint";

export const PHOTO_NAT_W = 3953;
export const PHOTO_NAT_H = 5507;
const PHOTO_HAIR_FRAC = 0.259;
const PHOTO_TARGET_PX = 48;
function computePhotoFit(boxW: number, boxH: number) {
  if (!boxW || !boxH) return 0;
  const s = boxW / PHOTO_NAT_W;
  const raw = PHOTO_TARGET_PX - s * PHOTO_HAIR_FRAC * PHOTO_NAT_H;
  return Math.min(0, Math.max(boxH - s * PHOTO_NAT_H, raw));
}

const RAIL_ROW_COMPACT_PX = 52;
export const RAIL_ROW_COMPACT_HEIGHT_PX = 44;
export const MENU_PANEL_WIDTH_PX = 288;
export const MENU_HEADER_PX = 44;
const LIVE_STRIP_HEADING_PX = 56;
export const LIVE_STRIP_ROW_PX = 56;
const LIVE_STRIP_PAD_PX = 12;
const LIVE_STRIP_WIDE_PX = 960;
const LIVE_STRIP_MAX_SHOWS = 4;
export const MENU_SOCIAL_PX = 64;
export const MENU_NAV_ITEMS = navItems.filter((item) => item.href !== "/live");
const CHAT_RAIL_MIN_PX = 280;
const RAIL_MAX_PX = 400;
const RAIL_PCT = 0.24;
export const RAIL_WIDTH_CSS = `clamp(${CHAT_RAIL_MIN_PX}px, ${RAIL_PCT * 100}%, ${RAIL_MAX_PX}px)`;
function clampRailWidth(rowWidthPx: number) {
  return Math.min(RAIL_MAX_PX, Math.max(CHAT_RAIL_MIN_PX, rowWidthPx * RAIL_PCT));
}
const CHAT_RAIL_COLLAPSED_KEY = "liveChatRailCollapsed";
export const DESKTOP_STAGE_ASPECT = 16 / 9;
export const OFFLINE_STAGE_ASPECT = 4 / 5;
const OFFLINE_SECONDARY_MIN_PX = 420;
export const CLIP_WRAPPER_MIN_PX = CLIP_MIN_H + 24;
const MOBILE_STAGE_MIN_PX = 44;
const MOBILE_CHAT_PANEL_MIN_PX = 240;

const RAIL_DURATION_MS = 250;
const RAIL_EASING = "cubic-bezier(0.2, 0, 0, 1)";

export function useLiveLayout({
  isOgMode,
  isLive,
  stageAspect,
  liveStripShowCount,
}: {
  isOgMode: boolean;
  isLive: boolean;
  stageAspect: number;
  liveStripShowCount: number;
}) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(isOgMode ? true : null);
  const vvHeight = useVisualViewportHeight();

  const fullBleedDesktop = isDesktop === true;

  const railRowCount = MENU_NAV_ITEMS.length;
  const railNavRef = useRef<HTMLElement>(null);
  const [railCompact, setRailCompact] = useState(false);
  useLayoutEffect(() => {
    if (!fullBleedDesktop) return;
    const el = railNavRef.current;
    if (!el) return;
    const update = () => {
      const { height } = el.getBoundingClientRect();
      if (!height) return;
      setRailCompact(height / railRowCount < RAIL_ROW_COMPACT_PX);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullBleedDesktop, railRowCount]);

  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const railMotionStyle: React.CSSProperties = reducedMotion
    ? { transitionDuration: "0ms" }
    : { transitionDuration: `${RAIL_DURATION_MS}ms`, transitionTimingFunction: RAIL_EASING };

  const desktopRowRef = useRef<HTMLDivElement>(null);
  const [desktopRowRect, setDesktopRowRect] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    if (!fullBleedDesktop) return;
    const el = desktopRowRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      setDesktopRowRect((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [fullBleedDesktop]);

  const [chatCollapsed, setChatCollapsedState] = useState(false);
  useLayoutEffect(() => {
    if (localStorage.getItem(CHAT_RAIL_COLLAPSED_KEY) === "true") setChatCollapsedState(true);
  }, []);
  const setChatCollapsed = (value: boolean) => {
    setChatCollapsedState(value);
    localStorage.setItem(CHAT_RAIL_COLLAPSED_KEY, String(value));
  };

  const mobileColRef = useRef<HTMLDivElement>(null);
  const [mobileColRect, setMobileColRect] = useState<{ width: number; height: number } | null>(null);
  useLayoutEffect(() => {
    const el = mobileColRef.current;
    if (!el) return;
    const update = () => {
      const { width, height } = el.getBoundingClientRect();
      if (!width || !height) return;
      setMobileColRect((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [headerHeightPx, setHeaderHeightPx] = useState(56);
  useLayoutEffect(() => {
    const update = () => {
      const value = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h"));
      if (!Number.isNaN(value)) setHeaderHeightPx(value);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, []);
  const [mobileScheduleIdealPx, setMobileScheduleIdealPx] = useState<number | null>(null);
  const handleMobileScheduleMeasured = useCallback((px: number) => {
    const rounded = Math.round(px);
    setMobileScheduleIdealPx((prev) => (prev === rounded ? prev : rounded));
  }, []);

  useLayoutEffect(() => {
    if (isOgMode) {
      setIsDesktop(true);
      return;
    }
    const mediaQuery = window.matchMedia(LIVE_DESKTOP_MEDIA_QUERY);
    setIsDesktop(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [isOgMode]);

  const colHeightPx = desktopRowRect ? desktopRowRect.height : null;
  const rowWidthPx = desktopRowRect ? desktopRowRect.width : null;
  const availableColWidthPx = rowWidthPx;
  const railWidthPx = rowWidthPx != null ? clampRailWidth(rowWidthPx) : null;
  const desktopChatRailVisible = isLive && !chatCollapsed;
  const desktopRightColVisible = !isLive || !chatCollapsed;
  const stageAvailableWidthPx =
    availableColWidthPx != null && railWidthPx != null
      ? Math.max(0, availableColWidthPx - (desktopRightColVisible ? railWidthPx : 0))
      : null;

  const liveStripShows = Math.min(liveStripShowCount, LIVE_STRIP_MAX_SHOWS);
  const liveStripHeightFor = (columns: number) =>
    LIVE_STRIP_HEADING_PX + Math.ceil(liveStripShows / columns) * LIVE_STRIP_ROW_PX + LIVE_STRIP_PAD_PX;
  const liveStripMinPx = liveStripHeightFor(4);

  const onlineStageHeightPx =
    stageAvailableWidthPx != null && colHeightPx != null
      ? Math.min(stageAvailableWidthPx / DESKTOP_STAGE_ASPECT, colHeightPx - liveStripMinPx)
      : null;
  const onlineStageBoxHeightPx = onlineStageHeightPx != null ? Math.ceil(onlineStageHeightPx) : null;
  const liveStripLeftoverPx =
    colHeightPx != null && onlineStageBoxHeightPx != null ? colHeightPx - onlineStageBoxHeightPx : null;
  const liveStripColumns =
    liveStripLeftoverPx != null && liveStripLeftoverPx >= liveStripHeightFor(2)
      ? 2
      : stageAvailableWidthPx != null && stageAvailableWidthPx >= LIVE_STRIP_WIDE_PX
        ? 4
        : 2;
  const liveStripRowPx =
    liveStripLeftoverPx != null
      ? (liveStripLeftoverPx - LIVE_STRIP_HEADING_PX - LIVE_STRIP_PAD_PX) /
        Math.max(1, Math.ceil(liveStripShows / liveStripColumns))
      : null;

  const [viewportHeightPx, setViewportHeightPx] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (!fullBleedDesktop) return;
    const update = () => setViewportHeightPx(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [fullBleedDesktop]);

  const offlineStageHeightPx =
    viewportHeightPx != null && rowWidthPx != null
      ? Math.max(0, Math.min(viewportHeightPx, (rowWidthPx - OFFLINE_SECONDARY_MIN_PX) / OFFLINE_STAGE_ASPECT))
      : null;
  const desktopStageHeightPx = isLive
    ? onlineStageBoxHeightPx
    : offlineStageHeightPx != null
      ? Math.ceil(offlineStageHeightPx)
      : null;
  const desktopStageWidthPx =
    desktopStageHeightPx != null
      ? Math.ceil(desktopStageHeightPx * (isLive ? DESKTOP_STAGE_ASPECT : OFFLINE_STAGE_ASPECT))
      : null;

  const desktopLeftColWidthPx = isLive ? stageAvailableWidthPx : null;

  const desktopPhotoFit =
    desktopStageWidthPx != null && desktopStageHeightPx != null
      ? computePhotoFit(desktopStageWidthPx, desktopStageHeightPx)
      : 0;

  const mobileOfflineScroll = isDesktop === false && !isLive && !isOgMode;
  const mobileViewportHeightPx = mobileOfflineScroll
    ? (vvHeight ?? (typeof window !== "undefined" ? window.innerHeight : 0)) - headerHeightPx
    : mobileColRect?.height ?? null;
  const mobileLandscape =
    !!mobileColRect && mobileViewportHeightPx != null && mobileColRect.width > mobileViewportHeightPx;
  const mobileStageFloorPx =
    mobileLandscape && mobileViewportHeightPx != null ? mobileViewportHeightPx * 0.4 : MOBILE_STAGE_MIN_PX;
  const mobileScheduleCapPx =
    mobileViewportHeightPx != null
      ? Math.min(mobileScheduleIdealPx ?? mobileViewportHeightPx, Math.max(0, mobileViewportHeightPx - mobileStageFloorPx))
      : mobileScheduleIdealPx;
  const mobileNaturalStageHeightPx = mobileColRect ? mobileColRect.width * (PHOTO_NAT_H / PHOTO_NAT_W) : null;
  const mobileStageHeightPx =
    mobileViewportHeightPx != null && mobileNaturalStageHeightPx != null && mobileScheduleCapPx != null
      ? Math.ceil(Math.min(mobileNaturalStageHeightPx, Math.max(mobileStageFloorPx, mobileViewportHeightPx - mobileScheduleCapPx)))
      : null;
  const mobileStageConstrained =
    !!mobileStageHeightPx && !!mobileNaturalStageHeightPx && mobileStageHeightPx < mobileNaturalStageHeightPx - 0.5;
  const mobilePhotoFit =
    mobileColRect && mobileStageHeightPx ? computePhotoFit(mobileColRect.width, mobileStageHeightPx) : 0;

  const mobileStageForChatPx =
    mobileColRect != null
      ? stageAspect >= 1
        ? mobileColRect.width / stageAspect
        : mobileViewportHeightPx
      : null;
  const mobileChatBelowPx =
    mobileViewportHeightPx != null && mobileStageForChatPx != null
      ? mobileViewportHeightPx - mobileStageForChatPx
      : null;
  const mobilePanelChat = mobileChatBelowPx != null && mobileChatBelowPx >= MOBILE_CHAT_PANEL_MIN_PX;

  return {
    isDesktop,
    fullBleedDesktop,
    vvHeight,
    mobileOfflineScroll,
    railRowCount,
    liveStripColumns,
    liveStripRowPx,
    railNavRef,
    railCompact,
    railMotionStyle,
    desktopRowRef,
    chatCollapsed,
    setChatCollapsed,
    mobileColRef,
    handleMobileScheduleMeasured,
    desktopStageHeightPx,
    desktopStageWidthPx,
    desktopChatRailVisible,
    desktopLeftColWidthPx,
    desktopPhotoFit,
    mobileLandscape,
    mobileStageHeightPx,
    mobileStageConstrained,
    mobilePhotoFit,
    mobilePanelChat,
  };
}
