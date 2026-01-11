"use client";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useAudio } from "../contexts/AudioContext";
import { ArrowIcon } from "../ArrowIcon";
import { Social } from "./Social";
import { ShopContent } from "./ShopContent";
import { TRACK_DATA } from "../data/tracks";

const LATEST_SINGLE_ID = "patience";

export const TOUR_DATES = [
  {
    id: 1,
    day: "16",
    dayOfWeek: "FRI",
    venue: "Fourth Plain Community Commons",
    city: "Vancouver, WA",
    address: "3101 E 4th Plain Blvd Ste 101, Vancouver, WA 98661",
    time: "5:30 PM",
    ticketUrl: "https://ticketstripe.com/betterworldconcert-vancouver",
  },
  {
    id: 2,
    day: "17",
    dayOfWeek: "SAT",
    venue: "Eastside Baha'i Center",
    city: "Bellevue, WA",
    address: "16007 NE 8th St, Bellevue, WA 98008",
    time: "5:00 PM",
    ticketUrl: "https://ticketstripe.com/betterworldconcert-bellevue-2026",
  },
  {
    id: 3,
    day: "18",
    dayOfWeek: "SUN",
    venue: "Ahimza Hayes Residence",
    city: "Edmonds, WA",
    address: "17118 68th Avenue West, Edmonds, WA 98026",
    time: "2:00 PM",
    ticketUrl: "https://ticketstripe.com/betterworldconcert-edmonds",
  },
  {
    id: 4,
    day: "19",
    dayOfWeek: "MON",
    venue: "Cowlitz County Historical Museum",
    city: "Kelso, WA",
    address: "405 Allen St, Kelso, WA 98626",
    time: "2:00 PM",
    ticketUrl: "https://ticketstripe.com/betterworldconcert-cowlitz-county",
  },
];

interface HomePageProps {
  initialScrollToTour?: boolean;
}

export default function HomePage({ initialScrollToTour = false }: HomePageProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [isMuted, setIsMuted] = useState(true);
  const [shouldAnimate, setShouldAnimate] = useState<boolean | null>(null);
  const [selectedDate, setSelectedDate] = useState<number | null>(1);
  const [menuOpen, setMenuOpen] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const [isPillHovered, setIsPillHovered] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);
  const hasScrolledRef = useRef(false);
  const lastScrollRef = useRef(0);
  const { currentTrack, isPlaying, isLoading, loadTrack, toggle } = useAudio();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasAnimatedRef.current) {
        setShouldAnimate(false);
      } else {
        setShouldAnimate(true);
        hasAnimatedRef.current = true;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialScrollToTour && !hasScrolledRef.current && containerRef.current) {
      hasScrolledRef.current = true;
      setTimeout(() => {
        containerRef.current?.scrollTo({ top: window.innerHeight, behavior: "smooth" });
      }, 100);
    }
  }, [initialScrollToTour]);

  // Auto-cycle through dates every 2 seconds (pauses on hover)
  useEffect(() => {
    if (isPillHovered) return;
    const interval = setInterval(() => {
      setSelectedDate((prev) => {
        const current = prev ?? 1;
        return current >= TOUR_DATES.length ? 1 : current + 1;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [isPillHovered]);

  // Hide nav on scroll down, show on scroll up
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => {
      const currentScroll = container.scrollTop;
      if (currentScroll > lastScrollRef.current && currentScroll > 100) {
        setNavVisible(false);
      } else {
        setNavVisible(true);
      }
      lastScrollRef.current = currentScroll;
    };
    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const imgClass = (i: number, alwaysColor = false) => {
    const base = "object-cover transform transition duration-300 ease-out";
    if (alwaysColor) {
      const isColored = hovered === null || hovered === i;
      const colorClass = isColored ? "grayscale-0" : "grayscale";
      const scaleClass = hovered === i ? "scale-105" : "";
      return `${base} ${colorClass} ${scaleClass}`.trim();
    }
    if (hovered === null) return `${base} grayscale`;
    return hovered === i ? `${base} grayscale-0 scale-105` : `${base} grayscale`;
  };

  const imgHandlers = (i: number) => ({
    onMouseEnter: () => {
      setHovered(i);
      if (i !== 3 && videoRef.current && !isMuted) {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    },
    onMouseLeave: () => setHovered(null),
    onTouchStart: () => {
      setHovered(i);
      if (i !== 3 && videoRef.current && !isMuted) {
        videoRef.current.muted = true;
        setIsMuted(true);
      }
    },
    onTouchEnd: () => setHovered(null),
  });

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const scrollToLinks = () => {
    document.getElementById("links-panel")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div
      ref={containerRef}
      className="h-full overflow-y-auto snap-y snap-proximity overscroll-contain touch-pan-y"
    >
      {/* Navigation Overlay - hides on scroll down */}
      <header
        className={`fixed top-0 left-0 right-0 z-40 pointer-events-none transition-all duration-300 ${
          navVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-full"
        }`}
      >
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
                Grab my merch and music
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
                  Here&apos;s my app, Lyrist
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
              Grab my merch and music
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
                Here&apos;s my app, Lyrist
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

      {/* Panel 1: Hero */}
      <div className="relative min-h-screen snap-start snap-always">
        <div className="absolute inset-0 z-0">
          <div className="h-full grid grid-cols-2 grid-rows-4 sm:grid-rows-6 sm:grid-cols-3 gap-0">
            <div className="relative row-span-3 sm:row-span-6 overflow-hidden" {...imgHandlers(1)}>
              <Image
                alt="newera"
                src={"/images/home/new-era-1.jpg"}
                fill
                className={imgClass(1)}
                priority
              />
              <div
                className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
                  hovered === 1 ? "opacity-0" : "opacity-100 bg-black/50"
                }`}
              />
            </div>
            <div className="relative row-span-1 sm:row-span-3 overflow-hidden" {...imgHandlers(2)}>
              <Image
                alt="bio"
                src={"/images/home/bio.jpeg"}
                fill
                className={imgClass(2, true)}
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div
                className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
                  hovered === null || hovered === 2 ? "opacity-0" : "opacity-100 bg-black/50"
                }`}
              />
            </div>
            <div
              className="relative row-span-3 sm:row-span-6 overflow-hidden"
              {...imgHandlers(3)}
              onClick={toggleMute}
            >
              <video
                ref={videoRef}
                className={`${imgClass(3)} absolute inset-0 w-full h-full object-cover`}
                loop
                muted
                autoPlay
              >
                <source src="/videos/windstock.mp4" type="video/mp4" />
              </video>
              <div
                className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
                  hovered === 3 ? "opacity-0" : "opacity-100 bg-black/50"
                }`}
              />
              <button
                className="absolute top-4 right-4 z-20 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors duration-200 text-white pointer-events-auto"
                aria-label={isMuted ? "Unmute video" : "Mute video"}
              >
                {isMuted ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                )}
              </button>
            </div>
            <div className="relative row-span-3 sm:row-span-6 overflow-hidden" {...imgHandlers(4)}>
              <Image
                alt="openmic"
                src={"/images/home/openmic.jpg"}
                fill
                className={imgClass(4)}
                priority
              />
              <div
                className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-300 ${
                  hovered === 4 ? "opacity-0" : "opacity-100 bg-black/50"
                }`}
              />
            </div>
          </div>
        </div>

        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_50%,rgba(0,0,0,0.5)_0%,transparent_70%)]" />
          </div>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 gap-0">
            <div className="pointer-events-auto flex flex-col items-center">
              {/* Unified tour bar - "ON TOUR" + dates + location */}
              <div
                className={`electric-border flex flex-col rounded-xl overflow-hidden backdrop-blur-md bg-black/30 w-[92vw] sm:w-auto ${
                  shouldAnimate === null
                    ? "opacity-0"
                    : shouldAnimate
                    ? "animate-hero-slide-up"
                    : "opacity-100"
                }`}
                onMouseEnter={() => setIsPillHovered(true)}
                onMouseLeave={() => setIsPillHovered(false)}
              >
                {/* Top section: tour label + dates/location */}
                <div className="flex flex-col sm:flex-row items-stretch">
                  {/* I'M GOING ON TOUR IN WA label */}
                  <div
                    className="flex flex-col items-center justify-center self-stretch bg-gradient-to-br from-orange-500 to-pink-500 px-6 py-3 sm:px-5 sm:py-4 md:px-6"
                  >
                    {/* Mobile: one line */}
                    <span className="font-bebas text-white leading-none whitespace-nowrap text-3xl sm:hidden">
                      I&apos;M GOING ON TOUR IN WA
                    </span>
                    {/* Desktop: two lines */}
                    <span className="font-bebas text-white leading-none hidden sm:block text-2xl md:text-3xl lg:text-4xl">
                      I&apos;M GOING ON
                    </span>
                    <span className="font-bebas text-white leading-none hidden sm:block text-2xl md:text-3xl lg:text-4xl">
                      TOUR IN WA
                    </span>
                    <span className="mt-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white font-semibold text-sm sm:text-xs md:text-sm uppercase tracking-wide">
                      All tickets free
                    </span>
                  </div>

                  {/* Right side: dates + location stacked */}
                  <div className="flex flex-col flex-1 min-w-0">
                    {/* Date buttons */}
                    <div className="relative flex items-stretch animate-slide-out-right flex-1">
                      {/* Sliding highlight */}
                      <div
                        className="absolute inset-y-0 bg-white/20 transition-transform duration-500 ease-out"
                        style={{
                          width: `${100 / TOUR_DATES.length}%`,
                          transform: `translateX(${((selectedDate ?? 1) - 1) * 100}%)`,
                        }}
                      />
                      {TOUR_DATES.map((date, index) => (
                        <a
                          key={date.id}
                          href={date.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onMouseEnter={() => setSelectedDate(date.id)}
                          onTouchStart={() => setSelectedDate(date.id)}
                          className="relative z-10 flex flex-col items-center justify-center flex-1 transition-all duration-200 animate-stagger-reveal px-3 py-4 sm:px-4 sm:py-4 md:px-5"
                          style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                        >
                          <span className="text-white/60 font-medium leading-none text-base sm:text-base">
                            {date.dayOfWeek}
                          </span>
                          <span className="text-white font-bold leading-none text-4xl sm:text-3xl md:text-4xl lg:text-5xl">
                            {date.day}
                          </span>
                        </a>
                      ))}
                    </div>

                    {/* Location row */}
                    <a
                      href={TOUR_DATES.find((d) => d.id === selectedDate)?.ticketUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-center text-center px-4 py-3 sm:px-5 sm:py-3 hover:bg-white/10 transition-colors border-t border-white/10"
                    >
                      <span className="text-white font-semibold truncate max-w-full text-lg sm:text-lg md:text-xl">
                        {TOUR_DATES.find((d) => d.id === selectedDate)?.venue}
                      </span>
                      <span className="text-white/70 text-lg sm:text-lg md:text-xl">
                        {TOUR_DATES.find((d) => d.id === selectedDate)?.city} ·{" "}
                        {TOUR_DATES.find((d) => d.id === selectedDate)?.time}
                      </span>
                    </a>
                  </div>
                </div>

                {/* Action button row - full width */}
                <button
                  onClick={scrollToLinks}
                  className="flex items-center justify-center gap-2 py-3 px-4 sm:py-4 hover:bg-white/10 transition-colors text-white font-medium border-t border-white/10 text-lg sm:text-lg md:text-xl"
                >
                  Grab my merch before the show
                  <svg
                    className="shrink-0 animate-bounce w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Play button - bottom left on desktop, bottom center on mobile */}
          <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 sm:left-4 md:left-6 sm:right-auto pointer-events-none flex justify-center sm:justify-start px-4 sm:px-0">
            <button
              onClick={() => {
                const latestTrack = TRACK_DATA.find((t) => t.id === LATEST_SINGLE_ID);
                if (latestTrack) {
                  if (currentTrack?.id === LATEST_SINGLE_ID) {
                    toggle();
                  } else {
                    loadTrack(
                      {
                        id: latestTrack.id,
                        title: latestTrack.title,
                        artist: latestTrack.artist,
                        src: latestTrack.audioUrl,
                        thumbnail: latestTrack.thumbnail,
                        duration: latestTrack.duration,
                      },
                      true
                    );
                  }
                }
              }}
              disabled={isLoading}
              className="pointer-events-auto flex items-center gap-2 py-2.5 px-4 sm:px-5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm disabled:opacity-50 transition-colors text-white font-medium text-base sm:text-lg"
            >
              {isLoading ? (
                <svg className="shrink-0 animate-spin w-5 h-5 sm:w-6 sm:h-6" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : currentTrack?.id === LATEST_SINGLE_ID && isPlaying ? (
                <svg className="shrink-0 w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="shrink-0 w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
              {isLoading ? "Loading..." : currentTrack?.id === LATEST_SINGLE_ID && isPlaying ? "Pause" : "Play my latest single"}
            </button>
          </div>
        </div>
      </div>

      {/* Panel 2: Shop */}
      <div id="links-panel" className="relative min-h-screen snap-start snap-always">
        <ShopContent showGallery={false} cancelPath="/" />
      </div>
    </div>
  );
}
