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
  const isMusicPage = pathname === "/music";
  const isIdeaPage = pathname === "/idea";

  return (
    <>
      <header
        className={`top-0 left-0 right-0 z-40 pointer-events-none ${
          isMusicPage || isIdeaPage ? "relative" : "absolute"
        }`}
      >
        <div className="flex items-center justify-start p-4 pointer-events-none">
          {/* mobile: hamburger on the left */}
          <div className="md:hidden">
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
          <nav className="hidden md:block pointer-events-auto">
            <div className="grid gap-y-2 text-left">
              <div className="flex flex-col space-y-2">
                <Link
                  title="PEYT SPENCER"
                  aria-label="PEYT SPENCER"
                  className={`text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 ${
                    isHomePage
                      ? "text-white hover:bg-white/10 hover:text-white"
                      : "text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                  } ${pathname === "/" ? "bg-white/10" : ""}`}
                  href="/"
                  aria-current={pathname === "/" ? "page" : undefined}
                >
                  Peyt rhymes with heat
                </Link>
                <Link
                  title="Here, I rap lyrics"
                  aria-label="Here, I rap lyrics"
                  className={`text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 ${
                    isHomePage
                      ? "text-white hover:bg-white/10 hover:text-white"
                      : "text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                  } ${pathname === "/music" ? "bg-white/10" : ""}`}
                  href="/music"
                  aria-current={pathname === "/music" ? "page" : undefined}
                >
                  Support my music
                </Link>
                <Link
                  title="Here's my app, Lyrist"
                  aria-label="Here's my app, Lyrist"
                  className={`group text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md inline-flex items-center space-x-2 transition transform hover:scale-105 ${
                    isHomePage
                      ? "text-white hover:bg-white/10 hover:text-white"
                      : "text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                  }`}
                  href="https://lyrist.app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="inline-flex items-center gap-2">
                    Find beats, beat writer&apos;s block
                    <ArrowIcon />
                  </span>
                </Link>
                <Link
                  title="Tell me more about your idea"
                  aria-label="Tell me more about your idea"
                  className={`text-lg md:text-xl lg:text-2xl font-medium px-3 py-1 rounded-md transition transform hover:scale-105 ${
                    isHomePage
                      ? "text-white hover:bg-white/10 hover:text-white"
                      : "text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white"
                  } ${pathname === "/idea" ? "bg-white/10" : ""}`}
                  href="/idea"
                  aria-current={pathname === "/idea" ? "page" : undefined}
                >
                  Have an app idea? Let&apos;s talk.
                </Link>
                <Social />
                {isMusicPage ? (
                  <div className="flex flex-col items-center pt-4 gap-4 w-full">
                    <Link
                      title="SoundBetter"
                      aria-label="SoundBetter"
                      href={"https://soundbetter.com/profiles/630479-peyt-spencer"}
                      className="w-full sm:flex-1 inline-flex items-center gap-1 px-4 py-2 bg-soundbetter text-white rounded-md font-medium hover:bg-soundbetter/80 text-lg pointer-events-auto"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span className="inline-flex items-center gap-2">
                        Feature me on your next song <ArrowIcon />
                      </span>
                    </Link>
                    <Link
                      title="Venmo"
                      aria-label="Venmo"
                      href="https://venmo.com/psdewar?txn=pay&note=Independent%20Artist%20Fund&private=true&amount=20"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:flex-1 inline-flex items-center gap-1 px-4 py-2 bg-venmo text-white rounded-md font-medium hover:bg-venmo/80 text-lg pointer-events-auto"
                    >
                      <span className="inline-flex items-center gap-2">
                        Contribute $20 to fuel my independence
                        <ArrowIcon />
                      </span>
                    </Link>
                  </div>
                ) : null}
                {isIdeaPage ? (
                  <div className="flex flex-col items-center pt-4 w-full">
                    <Link
                      title="Founder at Lyrist, Software Engineer at Microsoft"
                      aria-label="Founder at Lyrist, Software Engineer at Microsoft"
                      href={"resume.pdf"}
                      className="w-full sm:flex-1 inline-flex items-center gap-1 px-4 py-2 bg-lyrist text-white rounded-md font-medium hover:bg-lyrist/80 text-lg pointer-events-auto"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span className="inline-flex items-center gap-2">
                        Resume.pdf <ArrowIcon />
                      </span>
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </nav>
        </div>

        {/* mobile panel */}
        <div
          className={`md:hidden transition-all duration-200 ${
            menuOpen ? "fixed top-16 left-0 right-0 px-4 pb-4 z-50 pointer-events-auto" : "hidden"
          }`}
        >
          <div className="bg-white/90 dark:bg-neutral-900/70 backdrop-blur-sm rounded-lg p-4">
            <Link
              title="PEYT SPENCER"
              aria-label="PEYT SPENCER"
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
              title="Here, I rap lyrics"
              aria-label="Here, I rap lyrics"
              className={`block text-xl font-medium px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition transform hover:scale-105 ${
                pathname === "/music"
                  ? "bg-black/10 dark:bg-white/10 text-black dark:text-white"
                  : ""
              }`}
              href="/music"
              onClick={() => setMenuOpen(false)}
              aria-current={pathname === "/music" ? "page" : undefined}
            >
              Support my music
            </Link>
            <Link
              title="Here's my app, Lyrist"
              aria-label="Here's my app, Lyrist"
              className="group block text-xl font-medium gap-1 px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition transform hover:scale-105"
              href="https://lyrist.app"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
            >
              <span className="inline-flex items-center gap-2">
                Find beats, beat writer&apos;s block
                <ArrowIcon />
              </span>
            </Link>
            <Link
              title="Tell me more about your idea"
              aria-label="Tell me more about your idea"
              className={`block text-xl font-medium px-3 py-2 rounded-md text-neutral-800 dark:text-white hover:bg-black/10 dark:hover:bg-white/10 hover:text-black dark:hover:text-white transition transform hover:scale-105 ${
                pathname === "/idea"
                  ? "bg-black/10 dark:bg-white/10 text-black dark:text-white"
                  : ""
              }`}
              href="/idea"
              onClick={() => setMenuOpen(false)}
              aria-current={pathname === "/idea" ? "page" : undefined}
            >
              Have an app idea? Let&apos;s talk.
            </Link>
            <Social isMobilePanel />
          </div>
        </div>
        {isMusicPage ? (
          <div className="md:hidden px-4 flex flex-col items-center gap-4">
            <Link
              title="SoundBetter"
              aria-label="SoundBetter"
              href={"https://soundbetter.com/profiles/630479-peyt-spencer"}
              className="w-full sm:flex-1 inline-flex items-center gap-1 px-4 py-2 bg-soundbetter text-white rounded-md font-medium hover:bg-soundbetter/80 text-lg pointer-events-auto"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="inline-flex items-center gap-2">
                Feature me on your next song <ArrowIcon />
              </span>
            </Link>
            <Link
              title="Venmo"
              aria-label="Venmo"
              href="https://venmo.com/psdewar?txn=pay&note=Independent%20Artist%20Fund&private=true&amount=20"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:flex-1 inline-flex items-center gap-1 px-4 py-2 bg-venmo text-white rounded-md font-medium hover:bg-venmo/80 text-lg pointer-events-auto"
            >
              <span className="inline-flex items-center gap-2">
                Contribute $20 to fuel my independence
                <ArrowIcon />
              </span>
            </Link>
          </div>
        ) : null}
        {isIdeaPage ? (
          <div className="md:hidden px-4 flex flex-col items-center gap-4">
            <Link
              title="Founder at Lyrist, Software Engineer at Microsoft"
              aria-label="Founder at Lyrist, Software Engineer at Microsoft"
              href={"resume.pdf"}
              className="w-full sm:flex-1 inline-flex items-center gap-1 px-4 py-2 bg-lyrist text-white rounded-md font-medium hover:bg-lyrist/80 text-lg pointer-events-auto"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="inline-flex items-center gap-2">
                Resume.pdf <ArrowIcon />
              </span>
            </Link>
          </div>
        ) : null}
      </header>
    </>
  );
}
