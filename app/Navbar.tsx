"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowIcon } from "./ArrowIcon";
import { Social } from "./components/Social";

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname() ?? "/";
  const isHomePage = pathname === "/";
  const isMusicPage = pathname === "/listen";
  const isHirePage = pathname === "/hire";

  const useHorizontalNav = !isHomePage;

  const navItems = [
    { href: "/fund", label: "Fund" },
    { href: "/shop", label: "Shop" },
    { href: "/listen", label: "Listen" },
    { href: "https://lyrist.app", label: "Lyrist", external: true },
    { href: "/hire", label: "Hire" },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  if (useHorizontalNav) {
    return (
      <header className="sticky top-0 w-full z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Left: Logo + CTA */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="font-bebas text-2xl sm:text-3xl text-gray-900 dark:text-white hover:text-gray-600 dark:hover:text-gray-300 transition-colors tracking-tight"
              >
                Peyt Spencer
              </Link>
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
                      target={item.external ? "_blank" : undefined}
                      rel={item.external ? "noopener noreferrer" : undefined}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                        active
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                          : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {item.label}
                        {item.external && <ArrowIcon />}
                      </span>
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
                className="md:hidden p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
          <div className="px-4 py-3 pb-6 space-y-1 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-800/50">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-3 text-base font-medium rounded-lg transition-colors ${
                    active
                      ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    {item.label}
                    {item.external && <ArrowIcon />}
                  </span>
                </Link>
              );
            })}
            <div className="pt-2">
              <Social isMobilePanel />
            </div>

            {/* Page-specific CTA for mobile */}
            {isMusicPage && (
              <div className="pt-3">
                <Link
                  href="https://soundbetter.com/profiles/630479-peyt-spencer"
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-soundbetter text-white rounded-lg font-medium hover:bg-soundbetter/90 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Feature me on your next song <ArrowIcon />
                </Link>
              </div>
            )}
            {isHirePage && (
              <div className="pt-3 flex gap-2">
                <Link
                  href="/resume.pdf"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-lyrist text-white rounded-lg font-medium hover:bg-lyrist/90 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Resume <ArrowIcon />
                </Link>
                <Link
                  href="/peer-reviews.pdf"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Peer Reviews <ArrowIcon />
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
      <div className="flex items-center justify-start p-4 pointer-events-none">
        <div className="md:hidden">
          <button
            onClick={() => setMenuOpen((s) => !s)}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
            className="p-2 rounded-md pointer-events-auto bg-white/5 hover:bg-white/10 text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        <nav className="hidden md:block pointer-events-auto">
          <div className="flex flex-col space-y-2">
            <Link
              className="text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 text-white hover:bg-white/10 bg-white/10"
              href="/"
              aria-current="page"
            >
              Peyt rhymes with heat
            </Link>
            <Link
              className="text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 text-white hover:bg-white/10"
              href="/fund"
            >
              Fund my indie journey
            </Link>
            <Link
              className="text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 text-white hover:bg-white/10"
              href="/shop"
            >
              Shop for merch and music
            </Link>
            <Link
              className="text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 text-white hover:bg-white/10"
              href="/listen"
            >
              Here, I rap lyrics
            </Link>
            <Link
              className="text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 text-white hover:bg-white/10"
              href="https://lyrist.app"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="inline-flex items-center gap-2">
                Here's my app, Lyrist
                <ArrowIcon />
              </span>
            </Link>
            <Link
              className="text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 text-white hover:bg-white/10"
              href="/hire"
            >
              Hire me to build your app
            </Link>
            <Social />
          </div>
        </nav>
      </div>

      <div
        className={`md:hidden transition-all duration-200 ${
          menuOpen ? "fixed top-16 left-0 right-0 px-4 pb-4 z-50 pointer-events-auto" : "hidden"
        }`}
      >
        <div className="bg-white/90 dark:bg-neutral-900/70 backdrop-blur-sm rounded-lg p-4">
          <Link
            className="block text-xl font-medium px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition bg-black/10 dark:bg-white/10"
            href="/"
            onClick={() => setMenuOpen(false)}
            aria-current="page"
          >
            Peyt rhymes with heat
          </Link>
          <Link
            className="block text-xl font-medium px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition"
            href="/fund"
            onClick={() => setMenuOpen(false)}
          >
            Fund my indie journey
          </Link>
          <Link
            className="block text-xl font-medium px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition"
            href="/shop"
            onClick={() => setMenuOpen(false)}
          >
            Shop for merch and music
          </Link>
          <Link
            className="block text-xl font-medium px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition"
            href="/listen"
            onClick={() => setMenuOpen(false)}
          >
            Here, I rap lyrics
          </Link>
          <Link
            className="block text-xl font-medium px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition"
            href="https://lyrist.app"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
          >
            <span className="inline-flex items-center gap-2">
              Here's my app, Lyrist
              <ArrowIcon />
            </span>
          </Link>
          <Link
            className="block text-xl font-medium px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 transition"
            href="/hire"
            onClick={() => setMenuOpen(false)}
          >
            Hire me to build your app
          </Link>
          <Social isMobilePanel />
        </div>
      </div>
    </header>
  );
}
