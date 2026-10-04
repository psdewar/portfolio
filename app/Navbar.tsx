"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { HandHeartIcon, HeadphonesIcon, TShirtIcon, BroadcastIcon, TicketIcon, StarIcon, type Icon } from "@phosphor-icons/react";
import { ArrowIcon } from "./ArrowIcon";
import { Social, SOCIAL_LINKS } from "./components/Social";
import { usePatronStatus, usePatronTier } from "./hooks/usePatronStatus";
import { PATRON_TIERS } from "./data/patron-tiers";
import { LIVE_DESKTOP_HIDDEN } from "./live/live-breakpoint";
import { isFundPath, isLivePath } from "./lib/route-checks";

export const navItems = [
  { href: "/support", label: "Support" },
  { href: "/listen", label: "Listen" },
  { href: "/shop", label: "Shop" },
  { href: "/live", label: "Live" },
  { href: "/rsvp", label: "From The Ground Up" },
];

export const NAV_ICON: Record<string, Icon> = {
  "/support": HandHeartIcon,
  "/listen": HeadphonesIcon,
  "/shop": TShirtIcon,
  "/live": BroadcastIcon,
  "/rsvp": TicketIcon,
};

export const NAV_COLOR: Record<string, string> = {
  "/support": "#d4a553",
  "/listen": "#34d399",
  "/shop": "#a78bfa",
  "/live": "#ff3b5c",
  "/rsvp": "#38bdf8",
};

export const BRAND_SWEEP_STYLE: React.CSSProperties = {
  WebkitTextFillColor: "transparent",
  backgroundImage: "linear-gradient(to right, #fb923c 0%, #ec4899 50%, currentColor 50% 100%)",
  backgroundSize: "200% 100%",
  transition: "background-position 400ms ease",
};

const DRAWER_ICON_GUTTER = "pl-[calc(1rem-9px)] sm:pl-[calc(1.5rem-9px)]";
const DRAWER_SOCIAL_GUTTER = "pl-[calc(1rem-11px)] sm:pl-[calc(1.5rem-11px)]";

export function Navbar() {
  const headerRef = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const isPatron = usePatronStatus();
  const tier = usePatronTier();
  const tierDef = PATRON_TIERS.find((t) => t.name === tier);
  const pathname = usePathname() ?? "/";
  const isMusicPage = pathname === "/listen";
  const isHirePage = pathname === "/hire";
  const isFundPage = isFundPath(pathname);
  const isShopPage = pathname === "/shop" || pathname.startsWith("/shop/");
  const isLivePage = isLivePath(pathname);

  useEffect(() => {
    if (!isShopPage && !isLivePage) {
      setHidden(false);
      return;
    }
    const clampY = (raw: number) => {
      const max = Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
      return Math.min(Math.max(raw, 0), max);
    };
    let lastY = clampY(window.scrollY);
    let lastHeight = document.documentElement.scrollHeight;
    let accumDown = 0;
    let accumUp = 0;
    let lastHidden = hidden;
    const onScroll = () => {
      const height = document.documentElement.scrollHeight;
      if (height !== lastHeight) {
        lastHeight = height;
        lastY = clampY(window.scrollY);
        return;
      }
      const y = clampY(window.scrollY);
      const delta = y - lastY;
      lastY = y;
      if (delta === 0) return;
      if (delta > 0) {
        accumDown += delta;
        accumUp = 0;
      } else {
        accumUp += -delta;
        accumDown = 0;
      }
      let next = lastHidden;
      if (y <= 64 || accumUp > 32) {
        next = false;
      } else if (accumDown > 12) {
        next = true;
      }
      if (next !== lastHidden) {
        lastHidden = next;
        setHidden(next);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isShopPage, isLivePage]);

  const isActive = (href: string) => {
    const path = href.split("#")[0];
    if (path === "/") return pathname === "/";
    return pathname === path || pathname.startsWith(path + "/");
  };

  useEffect(() => {
    const header = headerRef.current;
    if (!header) {
      document.documentElement.style.removeProperty("--header-h");
      document.documentElement.style.removeProperty("--header-offset");
      return;
    }
    const shown = !hidden || menuOpen;
    const setHeaderHeight = () => {
      document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
      document.documentElement.style.setProperty("--header-offset", shown ? `${header.offsetHeight}px` : "0px");
    };
    setHeaderHeight();
    const observer = new ResizeObserver(setHeaderHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [isFundPage, hidden, menuOpen]);

  if (isFundPage) return null;

  return (
    <header
      ref={headerRef}
      className={`${isFundPage ? "" : `sticky ${hidden && !menuOpen ? "-top-16" : "top-0"}`} w-full z-40 bg-white dark:bg-gray-900 border-b border-gray-200/50 dark:border-gray-800/50 transition-[top] duration-300 ${
        isLivePage ? LIVE_DESKTOP_HIDDEN : ""
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <div className="flex items-center min-w-0">
              <Link
                href="/"
                className="group min-h-11 font-bebas text-2xl sm:text-3xl tracking-tight leading-none whitespace-nowrap text-gray-900 dark:text-white flex items-center -mb-1"
              >
                <span>Peyt</span>
                <span aria-hidden>&nbsp;</span>
                <span className="bg-clip-text bg-[position:100%_0%] group-hover:bg-[position:0%_0%]" style={BRAND_SWEEP_STYLE}>
                  Spencer
                </span>
              </Link>
              {isPatron && tierDef && (
                <Link
                  href="/listen"
                  className="shrink-0 ml-2 inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 border"
                  style={{
                    color: tierDef.color,
                    backgroundColor: `${tierDef.color}26`,
                    borderColor: `${tierDef.color}66`,
                  }}
                >
                  <tierDef.icon size={12} weight="bold" />
                  {tierDef.name}
                </Link>
              )}
              {isPatron && !tierDef && (
                <Link
                  href="/listen"
                  className="shrink-0 ml-2 text-[10px] font-semibold tracking-wide rounded-full px-2 py-0.5 text-[#d4a553] bg-[#d4a553]/15 border border-[#d4a553]/40"
                >
                  Supporter
                </Link>
              )}
            </div>
            {isHirePage && (
              <div className="hidden lg:flex items-center gap-2">
                <Link
                  href="/resume"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-lyrist text-white text-sm font-medium rounded-full hover:bg-lyrist/90 transition-colors whitespace-nowrap"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Resume <ArrowIcon />
                </Link>
                <Link
                  href="/peer-reviews.pdf"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-sm font-medium rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Peer Reviews <ArrowIcon />
                </Link>
              </div>
            )}
          </div>

          <nav className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`min-h-11 flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      active
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
              {isMusicPage && (
                <Link
                  href="https://soundbetter.com/profiles/630479-peyt-spencer"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-11 flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Feature me
                  <ArrowIcon />
                </Link>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <Social isHorizontal />
            </div>

            {isHirePage && (
              <div className="md:hidden flex items-center gap-1.5">
                <Link
                  href="/resume"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-lyrist text-white text-xs font-medium rounded-full hover:bg-lyrist/90 transition-colors whitespace-nowrap"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Resume
                  <ArrowIcon />
                </Link>
                <Link
                  href="/peer-reviews.pdf"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white text-xs font-medium rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors whitespace-nowrap"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Peers
                  <ArrowIcon />
                </Link>
              </div>
            )}
            <button
              onClick={() => setMenuOpen((s) => !s)}
              aria-expanded={menuOpen}
              aria-label="Toggle menu"
              className="md:hidden p-2.5 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="w-6 h-6 flex flex-col justify-center items-center gap-1.5">
                <span
                  className={`block h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out origin-center ${
                    menuOpen ? "rotate-45 translate-y-2" : ""
                  }`}
                />
                <span
                  className={`block h-0.5 w-5 bg-current transition-all duration-300 ease-in-out ${
                    menuOpen ? "opacity-0" : "opacity-100"
                  }`}
                />
                <span
                  className={`block h-0.5 w-5 bg-current transform transition-all duration-300 ease-in-out origin-center ${
                    menuOpen ? "-rotate-45 -translate-y-2" : ""
                  }`}
                />
              </div>
            </button>
          </div>
        </div>
      </div>

      <div
        className={`md:hidden overflow-hidden transition-[max-height] duration-200 ${
          menuOpen ? "max-h-screen" : "max-h-0"
        }`}
      >
        <div className="backdrop-blur-md bg-white/95 dark:bg-gray-900/95">
          <nav className="flex flex-col">
            {navItems.map((item) => {
              const active = isActive(item.href);
              const Icon = NAV_ICON[item.href] ?? BroadcastIcon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  aria-current={active ? "page" : undefined}
                  style={{ "--row": NAV_COLOR[item.href] ?? "#737373" } as React.CSSProperties}
                  className={`group flex h-14 items-center gap-2 pr-4 sm:pr-6 ${DRAWER_ICON_GUTTER} text-[17px] font-medium leading-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--row)] ${
                    active
                      ? "bg-gray-100 dark:bg-gray-800 text-[var(--row)]"
                      : "text-gray-600 dark:text-gray-400 hover:text-[var(--row)] hover:bg-gray-100 dark:hover:bg-gray-800/60 active:bg-gray-100 dark:active:bg-gray-800/60"
                  }`}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center">
                    <Icon size={22} weight={active ? "fill" : "regular"} />
                  </span>
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              );
            })}
            {isMusicPage && (
              <a
                href="https://soundbetter.com/profiles/630479-peyt-spencer"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                style={{ "--row": "#737373" } as React.CSSProperties}
                className={`group flex h-14 items-center gap-2 pr-4 sm:pr-6 ${DRAWER_ICON_GUTTER} text-[17px] font-medium leading-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--row)] text-gray-600 dark:text-gray-400 hover:text-[var(--row)] hover:bg-gray-100 dark:hover:bg-gray-800/60 active:bg-gray-100 dark:active:bg-gray-800/60`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center">
                  <StarIcon size={22} />
                </span>
                <span className="min-w-0 truncate">Feature me</span>
                <ArrowIcon />
              </a>
            )}
          </nav>
          <div className={`flex items-center border-t border-gray-200 dark:border-gray-800 pr-4 sm:pr-6 ${DRAWER_SOCIAL_GUTTER}`}>
            {SOCIAL_LINKS.map(({ href, label, icon: Icon, color }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                style={{ "--row": color } as React.CSSProperties}
                className="grid h-11 w-11 shrink-0 place-items-center text-gray-600 dark:text-gray-400 hover:text-[var(--row)] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--row)]"
              >
                <Icon size={22} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
