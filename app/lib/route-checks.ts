export const isFundPath = (pathname: string) => pathname === "/fund" || pathname.startsWith("/fund/");
export const isLivePath = (pathname: string) => pathname === "/live" || pathname.startsWith("/live/");
const SITE_RAIL_PATHS = new Set(["/listen", "/support", "/shop", "/rsvp"]);
export const hasSiteRail = (pathname: string) => SITE_RAIL_PATHS.has(pathname);
// /listen and /support start content beside the menu button; the other rail pages keep a band clear of it.
export const reservesRailHeader = (pathname: string) => hasSiteRail(pathname) && pathname !== "/listen" && pathname !== "/support";
export const hidesDesktopHeader = (pathname: string) => isLivePath(pathname) || hasSiteRail(pathname);
