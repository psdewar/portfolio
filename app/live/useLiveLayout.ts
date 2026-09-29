"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useVisualViewportHeight } from "../hooks/useVisualViewportHeight";
import { CLIP_MIN_H } from "../components/EnergyVideos";
import { navItems } from "../Navbar";
import { SOCIAL_LINKS } from "../components/Social";
import { ENERGY_VIDEO_IDS } from "../lib/videos.config";
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
const RAIL_NAV_WIDTH_PX = 72;
const RAIL_NAV_WIDTH_EXPANDED_PX = 220;
const DESKTOP_STAGE_MIN_PX = 390;
export const CHAT_RAIL_MIN_PX = 280;
const RAIL_MAX_PX = 400;
const RAIL_PCT = 0.24;
export const RAIL_WIDTH_CSS = `clamp(${CHAT_RAIL_MIN_PX}px, ${RAIL_PCT * 100}%, ${RAIL_MAX_PX}px)`;
function clampRailWidth(rowWidthPx: number) {
  return Math.min(RAIL_MAX_PX, Math.max(CHAT_RAIL_MIN_PX, rowWidthPx * RAIL_PCT));
}
const CHAT_RAIL_COLLAPSED_KEY = "liveChatRailCollapsed";
export const SUPPORT_OVERLAY_PX = 340;
export const DESKTOP_STAGE_ASPECT = 16 / 9;
export const CLIP_WRAPPER_MIN_PX = CLIP_MIN_H + 24;
const MOBILE_STAGE_MIN_PX = 44;
const MOBILE_CHAT_PANEL_MIN_PX = 240;

const RAIL_DURATION_MS = 250;
const RAIL_EASING = "cubic-bezier(0.2, 0, 0, 1)";

export function useLiveLayout({
  isOgMode,
  isLive,
  stageAspect,
}: {
  isOgMode: boolean;
  isLive: boolean;
  stageAspect: number;
}) {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(isOgMode ? true : null);
  const [isShortViewport, setIsShortViewport] = useState(false);
  const vvHeight = useVisualViewportHeight();

  const fullBleedDesktop = isDesktop === true;

  const railRowCount = 1 + navItems.length + SOCIAL_LINKS.length;
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

  const [desktopScheduleIdealPx, setDesktopScheduleIdealPx] = useState<number | null>(null);
  const handleDesktopScheduleMeasured = useCallback((px: number) => {
    const rounded = Math.round(px);
    setDesktopScheduleIdealPx((prev) => (prev === rounded ? prev : rounded));
  }, []);

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

  useLayoutEffect(() => {
    if (isOgMode) return;
    const mediaQuery = window.matchMedia("(max-height: 599px)");
    setIsShortViewport(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setIsShortViewport(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, [isOgMode]);

  const colHeightPx = desktopRowRect ? desktopRowRect.height : null;
  const rowWidthPx = desktopRowRect ? desktopRowRect.width : null;
  const railNavExpanded = !isLive && !railCompact;
  const railNavWidthPx = railNavExpanded ? RAIL_NAV_WIDTH_EXPANDED_PX : RAIL_NAV_WIDTH_PX;
  const availableColWidthPx = desktopRowRect ? Math.max(0, desktopRowRect.width - railNavWidthPx) : null;
  const railWidthPx = rowWidthPx != null ? clampRailWidth(rowWidthPx) : null;
  const desktopChatRailVisible = isLive && !chatCollapsed;
  const desktopRightColVisible = !isLive || !chatCollapsed;
  const stageAvailableWidthPx =
    availableColWidthPx != null && railWidthPx != null
      ? Math.max(0, availableColWidthPx - (desktopRightColVisible ? railWidthPx : 0))
      : null;

  const supportAreaHeight = Math.max(CLIP_WRAPPER_MIN_PX, desktopScheduleIdealPx ?? CLIP_WRAPPER_MIN_PX);

  const [bandFloorPx, setBandFloorPx] = useState<number | null>(null);
  const handleBandFloorMeasured = useCallback((px: number) => {
    const rounded = Math.round(px);
    setBandFloorPx((prev) => (prev === rounded ? prev : rounded));
  }, []);

  const schemeAHeightOffline =
    stageAvailableWidthPx != null && colHeightPx != null
      ? Math.min(stageAvailableWidthPx / DESKTOP_STAGE_ASPECT, colHeightPx - supportAreaHeight)
      : null;
  const schemeAWidthOffline =
    schemeAHeightOffline != null ? schemeAHeightOffline * DESKTOP_STAGE_ASPECT : null;
  const useSchemeS =
    !isLive && schemeAHeightOffline != null && schemeAWidthOffline != null && availableColWidthPx != null
      ? schemeAHeightOffline < DESKTOP_STAGE_MIN_PX || schemeAWidthOffline < availableColWidthPx / 2
      : false;

  const bandFloorActive = isLive && desktopChatRailVisible && bandFloorPx != null;
  const onlineStageHeightPx =
    stageAvailableWidthPx != null && colHeightPx != null
      ? bandFloorActive
        ? Math.min(stageAvailableWidthPx / DESKTOP_STAGE_ASPECT, Math.max(0, colHeightPx - bandFloorPx))
        : stageAvailableWidthPx / DESKTOP_STAGE_ASPECT
      : null;

  const schemeSMaxStageWidthPx =
    stageAvailableWidthPx != null ? Math.max(0, stageAvailableWidthPx - SUPPORT_OVERLAY_PX - 12) : null;
  const schemeSStageHeightPx =
    colHeightPx != null && schemeSMaxStageWidthPx != null
      ? Math.max(0, Math.min(colHeightPx - CLIP_WRAPPER_MIN_PX, schemeSMaxStageWidthPx / DESKTOP_STAGE_ASPECT))
      : null;
  const schemeSStripHeightPx =
    colHeightPx != null && schemeSStageHeightPx != null
      ? Math.max(CLIP_WRAPPER_MIN_PX, colHeightPx - schemeSStageHeightPx)
      : CLIP_WRAPPER_MIN_PX;

  const offlineSchemeABandHeightPx =
    colHeightPx != null ? Math.max(supportAreaHeight, colHeightPx * 0.45) : supportAreaHeight;
  const schemeABandHeightPx = !isLive ? offlineSchemeABandHeightPx : supportAreaHeight;
  const offlineSchemeAStageHeightPx =
    colHeightPx != null && stageAvailableWidthPx != null
      ? Math.max(
          DESKTOP_STAGE_MIN_PX,
          Math.min(stageAvailableWidthPx / DESKTOP_STAGE_ASPECT, colHeightPx - schemeABandHeightPx),
        )
      : null;

  const desktopStageHeightPxRaw = useSchemeS
    ? schemeSStageHeightPx
    : !isLive
      ? offlineSchemeAStageHeightPx
      : onlineStageHeightPx;
  const desktopStageHeightPx = desktopStageHeightPxRaw != null ? Math.ceil(desktopStageHeightPxRaw) : null;
  const desktopStageWidthPx =
    desktopStageHeightPx != null ? Math.ceil(desktopStageHeightPx * DESKTOP_STAGE_ASPECT) : null;

  const desktopNaturalColWidthPx =
    desktopStageWidthPx == null
      ? null
      : useSchemeS
        ? SUPPORT_OVERLAY_PX + 12 + desktopStageWidthPx
        : desktopStageWidthPx;
  const desktopLeftColMaxPx =
    availableColWidthPx != null && railWidthPx != null ? Math.max(0, availableColWidthPx - railWidthPx) : null;
  const desktopLeftColNaturalPx = isLive ? stageAvailableWidthPx : desktopNaturalColWidthPx;
  const desktopLeftColWidthPx = !desktopRightColVisible
    ? availableColWidthPx
    : desktopLeftColNaturalPx != null && desktopLeftColMaxPx != null
      ? Math.min(desktopLeftColNaturalPx, desktopLeftColMaxPx)
      : desktopLeftColNaturalPx;

  const desktopPhotoFit =
    desktopStageWidthPx != null && desktopStageHeightPx != null
      ? computePhotoFit(desktopStageWidthPx, desktopStageHeightPx)
      : 0;
  const stageNarrow = fullBleedDesktop && desktopStageWidthPx != null && desktopStageWidthPx < 600;

  const naturalClipsWidthFor = (stripHeightPx: number) =>
    Math.max(0, stripHeightPx - 24) * (9 / 16) * ENERGY_VIDEO_IDS.length + 12 * (ENERGY_VIDEO_IDS.length - 1);
  const schemeABandActualHeightPx =
    !useSchemeS && colHeightPx != null && desktopStageHeightPx != null
      ? Math.max(0, colHeightPx - desktopStageHeightPx)
      : schemeABandHeightPx;
  const naturalClipsWidth = naturalClipsWidthFor(useSchemeS ? schemeSStripHeightPx : schemeABandActualHeightPx);

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
    bandFloorPx,
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
  };
}
