"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { MicrophoneStageIcon, Waveform, LockSimple } from "@phosphor-icons/react";
import singles from "../../data/singles.json";
import { ArrowIcon } from "app/ArrowIcon";
import BlockVisualizer from "app/components/BlockVisualizer";
import FreestyleOverlay from "app/components/FreestyleOverlay";
import { useAudio } from "../contexts/AudioContext";
import { useSimulatedLoading } from "../contexts/DevToolsContext";
import { TRACK_DATA } from "../data/tracks";
import { isPatronTrack } from "../data/patron-config";
import { usePatronStatus } from "../hooks/usePatronStatus";
import StayConnected, { shouldShowStayConnected } from "app/components/StayConnected";
import ListenLoading from "./loading";

interface TrackCard {
  id: string;
  href?: string;
  src: string;
  title: string;
  hidden?: boolean;
}

const formatTrackTitle = (id: string) =>
  id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();


const BASE_TRACKS: TrackCard[] = singles.filter(Boolean).map((s) => {
  const thumbs: Record<string, string> = {
    patience:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--E7719B6C-A78A-4FA3-A3856E05A0DECA92--0--5534194--Patience.jpg?fm=jpg&q=75&w=800&s=80a8ec48e54fa6a4272145fbe4f8cc8d",
    safe: "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--95FB4456-AFFC-4BBA-B35454F57AFEACD6--0--2155951--Safe.jpg?fm=jpg&q=75&w=800&s=963f71818a966ef34ce6695be91dafae",
    "right-one":
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--2E4562A5-4A94-417F-B8E79FC4C167F81C--0--7059895--RightOne.jpg?fm=jpg&q=75&w=800&s=91a17d2eba0ab33e7e66cbb9ea443643",
    "where-i-wanna-be":
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--A0B1CB84-B25F-4D2D-9C327C33C11F567E--0--2456000--COVER5.jpg?fm=jpg&q=75&w=800&s=6a5ae0521975c2961d5d92519de8c03d",
    "critical-race-theory":
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--B18841A8-9A82-4802-AFDCD18E90A862B2--1599661443477--CRT2HD.jpg?fm=jpg&q=75&w=800&s=7fff4afae1ff89a3377a51d11677beb1",
    "better-days":
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--EF18880B-ADEA-42AB-AE111E4C3BFF353C--1576131163403--BetterDays.png?fm=jpg&q=75&w=800&s=281230a8f09faa3af7001b15d0e172c1",
    bahai:
      "https://distrokid.imgix.net/http%3A%2F%2Fgather.fandalism.com%2F817413--560B3DA9-4F3D-4874-97F8E29A9D568D05--1521580586925--bahai.jpg?fm=jpg&q=75&w=800&s=babfe73fe179c6bcb2215fd14c4ddfac",
  };
  return {
    href: `/${s}`,
    src: thumbs[s] ?? `https://distrokid.com/hyperfollow/peytspencer/${s}`,
    id: s,
    title: formatTrackTitle(s),
  };
});

const EXTRA_TRACKS: TrackCard[] = [
  {
    id: "mula-freestyle",
    title: "Mula Freestyle",
    src: "/images/covers/mula.jpg",
  },
];

// Patron-exclusive tracks (Welcome Pack)
const PATRON_TRACKS: TrackCard[] = [
  {
    id: "so-good",
    title: "So Good (2026)",
    src: "/images/covers/so-good.jpg",
  },
  {
    id: "crg-freestyle",
    title: "Can't Rush Greatness Freestyle (2026)",
    src: "/images/covers/crg-freestyle.jpg",
  },
];

// Tracks awaiting artwork
const ARTWORK_PENDING = new Set(["crg-freestyle", "so-good"]);

const ALL_TRACKS: TrackCard[] = [...PATRON_TRACKS, ...EXTRA_TRACKS, ...BASE_TRACKS];
const ALL_VISIBLE_TRACKS: TrackCard[] = ALL_TRACKS.filter((t) => !t.hidden);

// All tracks in TRACK_DATA are playable
const PLAYABLE_TRACK_IDS = new Set(TRACK_DATA.map((t) => t.id));

export default function Page() {
  const { loadTrack, loadPlaylist, currentTrack, loadingTrack, isPlaying, isLoading, toggle, playlist } =
    useAudio();
  const isSimulatingLoad = useSimulatedLoading();
  const isPatron = usePatronStatus();
  const [showStayConnected, setShowStayConnected] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [rsvpToast, setRsvpToast] = useState<string | null>(null);
  const [toastExiting, setToastExiting] = useState(false);

  // RSVP success toast (read URL once on mount, cleared by replaceState)
  useEffect(() => {
    const success = new URLSearchParams(window.location.search).get("success");
    if (success !== "rsvp" && success !== "rsvp_music") return;

    setRsvpToast(
      success === "rsvp_music"
        ? "You're in + music on the way. Check your email."
        : "You're in. Check your email for details."
    );
    window.history.replaceState({}, "", "/listen");

    const exitTimer = setTimeout(() => setToastExiting(true), 4500);
    const removeTimer = setTimeout(() => {
      setRsvpToast(null);
      setToastExiting(false);
    }, 5000);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  // All tracks visible - playback gated by patron status
  const visibleTracks = ALL_VISIBLE_TRACKS;

  // Check sessionStorage client-side to avoid hydration mismatch
  useEffect(() => {
    if (shouldShowStayConnected()) {
      setShowStayConnected(true);
    }
  }, []);
  const [playParam, setPlayParam] = useState<string | null>(null);
  const hasHandledAutoPlay = useRef(false);

  // Initial Playlist Load - skip if a track is already loading or loaded to avoid race condition
  useEffect(() => {
    if (playlist.length === 0 && !currentTrack && !loadingTrack) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPlayParam = urlParams.get("play");
      if (urlPlayParam && PLAYABLE_TRACK_IDS.has(urlPlayParam)) {
        return;
      }
      const patienceTrack = TRACK_DATA.find((track) => track.id === "patience");
      if (patienceTrack) {
        loadPlaylist([
          {
            id: patienceTrack.id,
            title: patienceTrack.title,
            artist: patienceTrack.artist,
            src: patienceTrack.audioUrl,
            thumbnail: patienceTrack.thumbnail,
            duration: patienceTrack.duration,
          },
        ]);
      }
    }
  }, [loadPlaylist, playlist.length, currentTrack, loadingTrack]);

  // Read URL param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    setPlayParam(urlParams.get("play"));
  }, []);

  const handlePlayTrack = useCallback(
    async (trackId: string, forcePlay = false) => {
      if (!PLAYABLE_TRACK_IDS.has(trackId)) return;

      if (currentTrack?.id === trackId) {
        if (forcePlay) {
          if (!isPlaying) toggle();
        } else {
          toggle();
        }
        return;
      }

      const trackData = TRACK_DATA.find((t) => t.id === trackId);
      if (!trackData) return;

      await loadTrack(
        {
          id: trackData.id,
          title: trackData.title,
          artist: trackData.artist,
          src: trackData.audioUrl,
          thumbnail: trackData.thumbnail,
          duration: trackData.duration,
        },
        true
      );
    },
    [currentTrack?.id, isPlaying, toggle, loadTrack]
  );

  // AUTO-PLAY LOGIC
  useEffect(() => {
    if (!playParam || hasHandledAutoPlay.current) return;

    if (PLAYABLE_TRACK_IDS.has(playParam)) {
      void handlePlayTrack(playParam, true);
      hasHandledAutoPlay.current = true;
    }
  }, [playParam, handlePlayTrack]);

  const playMula = playParam === "mula-freestyle";

  // Show skeleton while simulating slow network (dev only)
  if (isSimulatingLoad) {
    return <ListenLoading />;
  }

  return (
    <>
      {rsvpToast && (
        <div className="fixed top-20 left-0 right-0 z-[100] flex justify-center pointer-events-none">
          <div
            className={`pointer-events-auto flex items-center gap-3 bg-neutral-900 border border-[#d4a553]/30 px-5 py-3 rounded-lg shadow-2xl transition-all duration-500 ${toastExiting ? "opacity-0 -translate-y-2" : "opacity-100 translate-y-0"}`}
          >
            <div className="w-2 h-2 rounded-full bg-[#d4a553] flex-shrink-0" />
            <span className="text-neutral-200 text-sm">{rsvpToast}</span>
          </div>
        </div>
      )}

      {showStayConnected && !playParam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <StayConnected isModal onClose={() => setShowStayConnected(false)} />
        </div>
      )}

      <div className="animate-fade-in">
      {playMula && (
        <FreestyleOverlay
          trackId="mula-freestyle"
          coverSrc={
            ALL_TRACKS.find((t) => t.id === "mula-freestyle")?.src || "/images/covers/mula.jpg"
          }
          href={ALL_TRACKS.find((t) => t.id === "mula-freestyle")?.href}
          onClose={() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            setPlayParam(null);
            setShowStayConnected(false);
          }}
        />
      )}

      <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {visibleTracks.map((t) => {
          const isCurrent = currentTrack?.id === t.id;
          const isLoadingThis = loadingTrack?.id === t.id;
          const isPatronOnly = isPatronTrack(t.id);
          const canPlay = PLAYABLE_TRACK_IDS.has(t.id) && (isPatron || !isPatronOnly);

          return (
            <div
              key={t.id}
              className="relative overflow-hidden aspect-square group cursor-pointer"
              onClick={() => canPlay && handlePlayTrack(t.id)}
            >
              {brokenImages.has(t.id) ? (
                <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                  <Waveform size={48} weight="light" className="text-neutral-600" />
                </div>
              ) : (
                <Image
                  alt={t.title}
                  src={t.src}
                  fill
                  className="object-cover absolute inset-0"
                  loading="lazy"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  onError={() => setBrokenImages((prev) => new Set(prev).add(t.id))}
                />
              )}

              {brokenImages.has(t.id) && (
                <div className="absolute bottom-2 right-2 z-10">
                  <span className="text-sm font-medium text-white/80">{t.title}</span>
                </div>
              )}

              
              {ARTWORK_PENDING.has(t.id) && (
                <div className="absolute bottom-2 left-2 z-10">
                  <span className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white/80 uppercase tracking-wide">
                    Early Listen
                  </span>
                </div>
              )}

              {canPlay && isCurrent && !isLoadingThis && (
                <div className="absolute top-2 right-2 z-10">
                  <BlockVisualizer />
                </div>
              )}

              {/* Loading overlay for audio fetch */}
              {isLoadingThis && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-yellow-500/30 rounded-full" />
                    <div className="absolute inset-0 w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center p-4">
                <div className="w-full flex flex-col gap-2">
                  {canPlay && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayTrack(t.id);
                      }}
                      disabled={isLoadingThis}
                      className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 disabled:bg-yellow-600 text-black rounded font-medium shadow-lg flex items-center justify-center gap-2"
                    >
                      {isLoadingThis ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          Loading
                        </>
                      ) : isCurrent && isPlaying ? (
                        "Pause"
                      ) : (
                        "Play"
                      )}
                    </button>
                  )}
                  {isPatronOnly && !isPatron && (
                    <Link
                      href="/patron"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded font-medium shadow-lg flex items-center justify-center gap-2"
                    >
                      <MicrophoneStageIcon size={18} weight="regular" />
                      Play
                    </Link>
                  )}
                  {t.href && (
                    <Link
                      href={t.href}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full py-2 bg-white/90 text-black rounded font-medium shadow-lg flex items-center justify-center gap-2"
                    >
                      Stream <ArrowIcon />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </>
  );
}
