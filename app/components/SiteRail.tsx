"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { hasSiteRail, reservesRailHeader } from "../lib/route-checks";
import { MENU_ROW_COUNT } from "../live/useLiveLayout";
import { LIVE_DESKTOP_FLEX, MENU_HEADER_PX } from "../live/live-breakpoint";
import { MenuBrand } from "../live/MenuButton";
import { MenuRailPanel, useRailMenu } from "./MenuRail";

// Main tabs at the /live desktop breakpoint: the top header is hidden and the same slide-out
// rail as /live opens from a PEYT SPENCER menu button.
export function SiteRail() {
  const pathname = usePathname() ?? "";
  const scopeRef = useRef<HTMLDivElement>(null);
  const { menuOpen, menuPanelRef, menuControl, closeMenuOnLink } = useRailMenu(scopeRef);
  if (!hasSiteRail(pathname)) return null;

  return (
    <div ref={scopeRef} className={`hidden ${LIVE_DESKTOP_FLEX}`}>
      {reservesRailHeader(pathname) && <div aria-hidden className="w-full shrink-0" style={{ height: MENU_HEADER_PX }} />}
      <div className="fixed left-0 top-0 z-40">
        <MenuBrand {...menuControl} />
      </div>
      <MenuRailPanel
        open={menuOpen}
        panelRef={menuPanelRef}
        menuControl={menuControl}
        onNavClick={closeMenuOnLink}
        position="fixed"
        railRowCount={MENU_ROW_COUNT}
        railCompact={false}
      />
    </div>
  );
}
