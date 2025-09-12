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

  return (
    <header className="absolute top-0 left-0 right-0 z-40 pointer-events-none">
      <div className="flex items-center justify-start px-4 py-3 pointer-events-none">
        {/* mobile: hamburger on the left */}
        <div className="lg:hidden mr-3">
          <button
            onClick={() => setMenuOpen((s) => !s)}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
            className={`p-2 rounded-md pointer-events-auto ${
              isHomePage
                ? "bg-white/5 hover:bg-white/10 text-white"
                : "bg-black/10 dark:bg-white/5 hover:bg-black/15 dark:hover:bg-white/10 text-black dark:text-white"
            }`}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
              />
            </svg>
          </button>
        </div>

        {/* desktop menu (lg+) aligned left */}
        <nav className="hidden lg:block pointer-events-auto">
          <div className="grid gap-y-2 text-left">
            <div className="flex flex-col space-y-2">
              <Link
                className={`text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 hover:bg-white/10 hover:text-white ${
                  pathname === "/" ? "bg-white/10 text-white" : ""
                }`}
                href="/"
                aria-current={pathname === "/" ? "page" : undefined}
              >
                Peyt rhymes with heat
              </Link>
              <Link
                className={`text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 hover:bg-white/10 hover:text-white ${
                  pathname === "/music" ? "bg-white/10 text-white" : ""
                }`}
                href="/music"
                aria-current={pathname === "/music" ? "page" : undefined}
              >
                Support my music
              </Link>

              <Link
                className={`text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 hover:bg-white/10 hover:text-white ${
                  pathname === "/idea" ? "bg-white/10 text-white" : ""
                }`}
                href="/idea"
                aria-current={pathname === "/idea" ? "page" : undefined}
              >
                Hire me to build your app
              </Link>

              <a
                title="lyrist.app - find beats, beat writer's block"
                aria-label="Lyrist: find beats and beat writer's block"
                className="group text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md inline-flex items-center space-x-2 transition transform hover:scale-105 hover:bg-white/10 hover:text-white"
                href="https://lyrist.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="inline-flex items-center gap-2">
                  Find beats, beat writer&apos;s block
                  <ArrowIcon />
                </span>
              </a>
              <Social />
            </div>
          </div>
        </nav>
      </div>

      {/* mobile panel */}
      <div
        className={`lg:hidden transition-all duration-200 ${
          menuOpen ? "fixed top-16 left-0 right-0 px-4 pb-4 z-50 pointer-events-auto" : "hidden"
        }`}
      >
        <div className="bg-white/90 dark:bg-neutral-900/70 backdrop-blur-sm rounded-lg p-4">
          <Link
            className={`block text-xl font-medium px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition transform hover:scale-105 ${
              pathname === "/" ? "bg-black/10 dark:bg-white/10 text-black dark:text-white" : ""
            }`}
            href="/"
            onClick={() => setMenuOpen(false)}
            aria-current={pathname === "/" ? "page" : undefined}
          >
            Peyt rhymes with heat
          </Link>
          <Link
            className={`block text-xl font-medium px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition transform hover:scale-105 ${
              pathname === "/music" ? "bg-black/10 dark:bg-white/10 text-black dark:text-white" : ""
            }`}
            href="/music"
            onClick={() => setMenuOpen(false)}
            aria-current={pathname === "/music" ? "page" : undefined}
          >
            Support my music
          </Link>
          <Link
            className={`block text-xl font-medium px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition transform hover:scale-105 ${
              pathname === "/idea" ? "bg-black/10 dark:bg-white/10 text-black dark:text-white" : ""
            }`}
            href="/idea"
            onClick={() => setMenuOpen(false)}
            aria-current={pathname === "/idea" ? "page" : undefined}
          >
            Hire me to build your app
          </Link>
          <a
            className="group block text-xl font-medium gap-1 px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition transform hover:scale-105"
            href="https://lyrist.app"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
          >
            <span className="inline-flex items-center gap-2">
              Find beats, beat writer&apos;s block
              <span className="transform transition-transform duration-300 group-hover:-rotate-12 dark:text-neutral-300 inline-flex">
                <ArrowIcon />
              </span>
            </span>
          </a>
          <Social />
        </div>
      </div>
    </header>
  );
}
