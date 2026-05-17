"use client";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  WaveformIcon,
  LockSimpleIcon,
  DownloadSimpleIcon,
} from "@phosphor-icons/react";
import singles from "../../data/singles.json";
import BlockVisualizer from "app/components/BlockVisualizer";
import SingleOverlay from "app/components/SingleOverlay";
import { useAudio } from "../contexts/AudioContext";
import { useSimulatedLoading } from "../contexts/DevToolsContext";
import { TRACK_DATA } from "../data/tracks";
import { isPatronTrack } from "../data/patron-config";
import { usePatronStatus } from "../hooks/usePatronStatus";
import StayConnected, { shouldShowStayConnected } from "app/components/StayConnected";
import { useToast } from "../contexts/ToastContext";
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
  const trackData = TRACK_DATA.find((t) => t.id === s);
  const hasInlineLinks = !!trackData?.streamingLinks?.length;
  return {
    href: hasInlineLinks ? undefined : `/${s}`,
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

const ARTWORK_PENDING = new Set(["crg-freestyle", "so-good"]);
const WELCOME_PACK_IDS = new Set(PATRON_TRACKS.map((t) => t.id));

const ALL_TRACKS: TrackCard[] = [...PATRON_TRACKS, ...EXTRA_TRACKS, ...BASE_TRACKS];
const ALL_VISIBLE_TRACKS: TrackCard[] = ALL_TRACKS.filter((t) => !t.hidden);

const PLAYABLE_TRACK_IDS = new Set(
  TRACK_DATA.filter((t) => (t.source ?? "hosted") === "hosted").map((t) => t.id),
);

export default function Page() {
  const {
    loadTrack,
    loadPlaylist,
    currentTrack,
    loadingTrack,
    isPlaying,
    toggle,
    stop,
    playlist,
  } = useAudio();
  const isSimulatingLoad = useSimulatedLoading();
  const isPatron = usePatronStatus();
  const [showStayConnected, setShowStayConnected] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [suppressHoverId, setSuppressHoverId] = useState<string | null>(null);
  const [patronWelcome, setPatronWelcome] = useState(false);
  const [patronEmail, setPatronEmail] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    setPatronEmail(localStorage.getItem("patronEmail"));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");

    if (params.get("patron_welcome") === "1") {
      setPatronWelcome(true);
      window.history.replaceState({}, "", "/listen");
      setTimeout(() => setPatronWelcome(false), 4000);
      return;
    }

    const SUCCESS_MESSAGES: Record<string, string> = {
      rsvp: "You're in. Check your email for details.",
      rsvp_music: "You're in + music on the way. Check your email.",
      funded: "Contribution received. Thank you.",
      patron_live: "Thank you for supporting.",
    };

    const message = success ? SUCCESS_MESSAGES[success] : null;
    if (!message) return;

    toast.show(message, 5000);
    window.history.replaceState({}, "", "/listen");
  }, [toast]);

  const visibleTracks = ALL_VISIBLE_TRACKS;

  useEffect(() => {
    if (shouldShowStayConnected()) {
      setShowStayConnected(true);
    }
  }, []);
  const [playParam, setPlayParam] = useState<string | null>(null);
  const hasHandledAutoPlay = useRef(false);

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

  const searchParams = useSearchParams();
  useEffect(() => {
    setPlayParam(searchParams?.get("play") ?? null);
  }, [searchParams]);

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
        true,
      );
    },
    [currentTrack?.id, isPlaying, toggle, loadTrack],
  );

  useEffect(() => {
    if (!playParam || hasHandledAutoPlay.current) return;
    hasHandledAutoPlay.current = true;

    if (currentTrack?.id === playParam) return;

    if (PLAYABLE_TRACK_IDS.has(playParam)) {
      void handlePlayTrack(playParam, true);
    }
  }, [playParam, handlePlayTrack, currentTrack]);

  const overlayTrack = playParam ? ALL_TRACKS.find((t) => t.id === playParam) : undefined;
  const overlayIndex = playParam ? visibleTracks.findIndex((t) => t.id === playParam) : -1;
  const trackCount = visibleTracks.length;
  const prevTrack =
    overlayIndex >= 0 && trackCount > 1
      ? visibleTracks[(overlayIndex - 1 + trackCount) % trackCount]
      : undefined;
  const nextTrack =
    overlayIndex >= 0 && trackCount > 1
      ? visibleTracks[(overlayIndex + 1) % trackCount]
      : undefined;
  const prevTrackId = prevTrack?.id;
  const nextTrackId = nextTrack?.id;

  const openTrackOverlay = useCallback(
    (trackId: string) => {
      window.history.pushState({}, "", `/listen?play=${trackId}`);
      hasHandledAutoPlay.current = true;
      setPlayParam(trackId);
      const isHosted = PLAYABLE_TRACK_IDS.has(trackId);
      const isPatronOnly = isPatronTrack(trackId);
      const allowed = isHosted && (isPatron || !isPatronOnly);
      if (allowed) {
        void handlePlayTrack(trackId, true);
      } else if (isPatronOnly && !isPatron) {
        stop();
      }
    },
    [handlePlayTrack, isPatron, stop],
  );

  if (isSimulatingLoad) {
    return <ListenLoading />;
  }

  return (
    <>
      {showStayConnected && !playParam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <StayConnected isModal onClose={() => setShowStayConnected(false)} />
        </div>
      )}

      {overlayTrack && (
        <SingleOverlay
          trackId={overlayTrack.id}
          coverSrc={overlayTrack.src}
          href={overlayTrack.href}
          artworkPending={ARTWORK_PENDING.has(overlayTrack.id)}
          prevCoverSrc={prevTrack?.src}
          nextCoverSrc={nextTrack?.src}
          onPrev={prevTrackId ? () => openTrackOverlay(prevTrackId) : undefined}
          onNext={nextTrackId ? () => openTrackOverlay(nextTrackId) : undefined}
          onClose={() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            setPlayParam(null);
            setShowStayConnected(false);
          }}
        />
      )}

      {isPatron && (
        <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border-b border-neutral-800 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-bebas text-2xl text-white">Your Exclusive Content</h2>
              {patronEmail ? (
                <a
                  href={`/api/stripe-portal?email=${encodeURIComponent(patronEmail)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-400 hover:text-white text-sm underline underline-offset-2 transition-colors"
                >
                  Manage subscription
                </a>
              ) : (
                <button
                  onClick={() => {
                    const email = prompt("Enter the email you used to subscribe:");
                    if (!email) return;
                    localStorage.setItem("patronEmail", email);
                    setPatronEmail(email);
                    window.open(
                      `/api/stripe-portal?email=${encodeURIComponent(email)}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                  }}
                  className="text-neutral-400 hover:text-white text-sm underline underline-offset-2 transition-colors"
                >
                  Manage subscription
                </button>
              )}
            </div>
            <a
              href="/api/download/pack?file=singles-16s-2025"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white rounded-lg font-medium transition-colors"
            >
              <DownloadSimpleIcon size={20} weight="bold" />
              Download Singles & 16s Pack
            </a>
          </div>
        </div>
      )}

      <div className="w-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {visibleTracks.map((t) => {
          const isCurrent = currentTrack?.id === t.id;
          const isLoadingThis = loadingTrack?.id === t.id;

          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setSuppressHoverId(t.id);
                openTrackOverlay(t.id);
              }}
              onPointerLeave={() => {
                if (suppressHoverId === t.id) setSuppressHoverId(null);
              }}
              aria-label={`Open ${t.title}`}
              className={`relative aspect-square overflow-hidden cursor-pointer text-left transition-transform duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset${
                suppressHoverId === t.id ? "" : " hover:scale-[1.05] hover:z-[70]"
              }${
                patronWelcome && WELCOME_PACK_IDS.has(t.id) ? " animate-patron-glow" : ""
              }`}
            >
              {brokenImages.has(t.id) ? (
                <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
                  <WaveformIcon size={48} weight="light" className="text-neutral-600" />
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

              {isCurrent && !isLoadingThis && (
                <div className="absolute top-2 right-2 z-10">
                  <BlockVisualizer />
                </div>
              )}

              {patronWelcome && WELCOME_PACK_IDS.has(t.id) && (
                <div className="absolute inset-0 z-30 animate-patron-unlock flex flex-col items-center justify-center gap-3">
                  <LockSimpleIcon
                    size={64}
                    weight="bold"
                    className="text-[#d4a553] drop-shadow-[0_0_20px_rgba(212,165,83,0.6)]"
                  />
                  <span className="text-xs uppercase tracking-widest text-white/70 font-medium">
                    Unlocking
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
