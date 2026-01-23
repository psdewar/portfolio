"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowIcon } from "./ArrowIcon";
import { Social } from "./components/Social";
import { useDevTools } from "./contexts/DevToolsContext";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isPatron, setIsPatron] = useState(false);
  const { simulatePatron } = useDevTools();
  const pathname = usePathname() ?? "/";
  const isHomePage = pathname === "/";
  const isMusicPage = pathname === "/listen";
  const isHirePage = pathname === "/hire";

  useEffect(() => {
    const patronStatus = localStorage.getItem("patronStatus");
    const patronEmail = localStorage.getItem("patronEmail");
    setIsPatron((patronStatus === "active" && !!patronEmail) || simulatePatron);
  }, [simulatePatron]);

  // Homepage: immersive fullscreen hero with no navbar
  if (isHomePage) return null;

  const useHorizontalNav = true;

  const navItems = [
    { href: "/patron", label: isPatron ? "Updates" : "Patron" },
    { href: "/listen", label: "Listen" },
    { href: "/live", label: "Live" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  if (useHorizontalNav) {
    const headerClasses = isHomePage
      ? "absolute top-0 w-full z-40"
      : "sticky top-0 w-full z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50";

    return (
      <header className={headerClasses}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Left: Logo + CTA */}
            <div className="flex items-center gap-4">
              {!isHomePage && (
                <Link
                  href="/"
                  className="font-bebas text-2xl sm:text-3xl transition-colors tracking-tight leading-none text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 flex items-center -mb-1"
                >
                  Peyt Spencer
                </Link>
              )}
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
                    href="/resume.pdf"
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

            {/* Center: Nav items - absolutely positioned to stay centered */}
            <nav className="hidden md:flex items-center absolute left-1/2 -translate-x-1/2">
              <div className="flex items-center gap-1">
                {navItems.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        isHomePage
                          ? active
                            ? "bg-white/20 text-white"
                            : "text-white/80 hover:text-white hover:bg-white/10"
                          : active
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

            {/* Right: Social icons + Mobile menu */}
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <Social isHorizontal />
              </div>

              {/* Mobile CTA buttons */}
              {isMusicPage && (
                <Link
                  href="https://soundbetter.com/profiles/630479-peyt-spencer"
                  className="md:hidden inline-flex items-center gap-1 px-2.5 py-1.5 bg-soundbetter text-white text-xs font-medium rounded-full hover:bg-soundbetter/90 transition-colors whitespace-nowrap"
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
                    href="/resume.pdf"
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
                className={`md:hidden p-2 rounded-lg transition-colors ${
                  isHomePage
                    ? "text-white hover:bg-white/10"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
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
          <div className={`px-4 py-3 pb-6 space-y-1 backdrop-blur-md ${
            isHomePage
              ? "bg-neutral-900/95 border-t border-white/10"
              : "bg-white/95 dark:bg-gray-900/95 border-t border-gray-200/50 dark:border-gray-800/50"
          }`}>
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-3 text-base font-medium rounded-lg transition-colors ${
                    isHomePage
                      ? active
                        ? "bg-white/20 text-white"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                      : active
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                        : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </header>
    );
  }

  // Fallback non-horizontal nav (currently disabled by useHorizontalNav = true above)
  return null;
}
