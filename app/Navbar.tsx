"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowIcon } from "./ArrowIcon";
import { Social } from "./components/Social";
import { usePatronStatus, usePatronTier } from "./hooks/usePatronStatus";
import { PATRON_TIERS } from "./data/patron-tiers";
import { LIVE_DESKTOP_HIDDEN } from "./live/live-breakpoint";

export const navItems = [
  { href: "/support", label: "Support" },
  { href: "/listen", label: "Listen" },
  { href: "/shop", label: "Shop" },
  { href: "/live", label: "Live" },
  { href: "/rsvp", label: "From The Ground Up" },
];

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
  const isFundPage = pathname === "/fund" || pathname.startsWith("/fund/");
  const isShopPage = pathname === "/shop" || pathname.startsWith("/shop/");
  const isLivePage = pathname === "/live" || pathname.startsWith("/live/");

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
                className="min-h-11 font-bebas text-2xl sm:text-3xl transition-colors tracking-tight leading-none text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 flex items-center -mb-1"
              >
                Peyt Spencer
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
            {isMusicPage && (
              <Link
                href="https://soundbetter.com/profiles/630479-peyt-spencer"
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 bg-soundbetter text-white text-sm font-medium rounded-full hover:bg-soundbetter/90 transition-colors whitespace-nowrap"
                target="_blank"
                rel="noopener noreferrer"
              >
                Feature me
                <ArrowIcon />
              </Link>
            )}
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
            </div>
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden md:block">
              <Social isHorizontal />
            </div>

            {isMusicPage && (
              <Link
                href="https://soundbetter.com/profiles/630479-peyt-spencer"
                className="md:hidden min-h-11 inline-flex items-center gap-1 px-2.5 py-1.5 bg-soundbetter text-white text-xs font-medium rounded-full hover:bg-soundbetter/90 transition-colors whitespace-nowrap"
                target="_blank"
                rel="noopener noreferrer"
              >
                Feature me
                <ArrowIcon />
              </Link>
            )}
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
        <div className="px-4 sm:px-6 lg:px-8 py-3 pb-6 space-y-1 backdrop-blur-md bg-white/95 dark:bg-gray-900/95">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-3 text-base font-medium rounded-lg transition-colors ${
                  active
                    ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="px-3 pt-4">
            <Social isHorizontal />
          </div>
        </div>
      </div>
    </header>
  );
}
