"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import singles from "../../data/singles.json";
import { ArrowIcon } from "app/ArrowIcon";
import FreestyleOverlay from "app/components/FreestyleOverlay";
import { useAudio } from "../contexts/AudioContext";
import { TRACK_DATA } from "../data/tracks";
import StayConnected, { shouldShowStayConnected } from "app/components/StayConnected";
import { stripePromise } from "../lib/stripe";

interface TrackCard {
  id: string;
  href?: string;
  src: string;
  title: string;
}

const formatTrackTitle = (id: string) =>
  id
    .replace(/-/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();

const PaymentModal = dynamic(
  () => import("../components/PaymentModal").then((mod) => ({ default: mod.PaymentModal })),
  { ssr: false }
);

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
    title: "Peyt Spencer - Mula Freestyle",
    src: "/images/mula-dinner-cover.jpg",
  },
];

const TRACKS: TrackCard[] = [...EXTRA_TRACKS, ...BASE_TRACKS];
const FIXED_PRICE_DOWNLOADS: Record<string, number> = { "mula-freestyle": 100 };
const PLAYABLE_TRACK_IDS = new Set(["patience", "mula-freestyle"]);
const DOWNLOADABLE_TRACK_IDS = new Set(["patience", "mula-freestyle"]);

export default function Page() {
  const { loadTrack, loadPlaylist, currentTrack, isPlaying, toggle, playlist } = useAudio();
  const [showStayConnected, setShowStayConnected] = useState(() => shouldShowStayConnected());
  const [playParam, setPlayParam] = useState<string | null>(null);
  const downloadInitiatedRef = useRef(false);
  const hasHandledAutoPlay = useRef(false); // CRITICAL FIX: prevents loop

  const [fixedCheckoutTrack, setFixedCheckoutTrack] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    trackId: string;
    trackTitle: string;
    trackThumbnail: string;
  }>({ isOpen: false, trackId: "", trackTitle: "", trackThumbnail: "" });

  // Initial Playlist Load
  useEffect(() => {
    if (playlist.length === 0) {
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
  }, [loadPlaylist, playlist.length]);

  // Read URL param
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    setPlayParam(urlParams.get("play"));
  }, []);

  // AUTO-PLAY LOGIC - Strictly runs once per playParam
  useEffect(() => {
    if (!playParam || hasHandledAutoPlay.current) return;

    if (PLAYABLE_TRACK_IDS.has(playParam)) {
      void handlePlayTrack(playParam, true); // Force play
      hasHandledAutoPlay.current = true; // Mark as handled immediately
    }
  }, [playParam]);

  // Handle successful payment
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const sessionId = urlParams.get("session_id");

    if (
      success === "true" &&
      sessionId &&
      sessionId.startsWith("cs_") &&
      !downloadInitiatedRef.current
    ) {
      downloadInitiatedRef.current = true;
      const downloadTrack = async () => {
        try {
          const sessionResponse = await fetch(`/api/download/session-info?session_id=${sessionId}`);
          if (!sessionResponse.ok) throw new Error("Failed to verify session");
          const sessionData = await sessionResponse.json();
          if (sessionData.paymentStatus !== "paid") throw new Error("Payment not completed");

          const response = await fetch(
            `/api/download/${sessionData.trackId}?session_id=${sessionId}`
          );
          if (!response.ok) throw new Error(`Download failed`);

          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          const filename =
            response.headers.get("content-disposition")?.match(/filename="([^"]+)"/)?.[1] ||
            "download.mp3";
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error("Download failed:", error);
          downloadInitiatedRef.current = false;
          window.history.replaceState({}, document.title, window.location.pathname);
          alert("Download failed. Please try again.");
        }
      };
      downloadTrack();
    }
  }, []);

  const handlePlayTrack = async (trackId: string, forcePlay = false) => {
    if (!PLAYABLE_TRACK_IDS.has(trackId)) return;

    // Check if already loaded
    if (currentTrack?.id === trackId) {
      if (forcePlay) {
        // If we are forcing play (url param), ensure it plays
        if (!isPlaying) toggle();
      } else {
        // Standard interaction: toggle
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
    ); // Always autoPlay when explicitly selected
  };

  const openPaymentModal = (trackId: string) => {
    const track = TRACKS.find((t) => t.id === trackId);
    if (track) {
      setPaymentModal({
        isOpen: true,
        trackId,
        trackTitle: track.title,
        trackThumbnail: track.src,
      });
    }
  };

  const startFixedPriceCheckout = async (trackId: string) => {
    const amount = FIXED_PRICE_DOWNLOADS[trackId];
    if (!amount) return;
    try {
      setFixedCheckoutTrack(trackId);
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          trackId,
          trackTitle: TRACKS.find((t) => t.id === trackId)?.title,
          mode: "download",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const stripe = await stripePromise;
      if (stripe) await stripe.redirectToCheckout({ sessionId: data.sessionId });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setFixedCheckoutTrack(null);
    }
  };

  const handleDownloadClick = (trackId: string) => {
    if (FIXED_PRICE_DOWNLOADS[trackId]) return void startFixedPriceCheckout(trackId);
    openPaymentModal(trackId);
  };

  const playMula = playParam === "mula-freestyle";

  return (
    <>
      {showStayConnected && !playParam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <StayConnected isModal onClose={() => setShowStayConnected(false)} />
        </div>
      )}

      {playMula && (
        <FreestyleOverlay
          trackId="mula-freestyle"
          coverSrc={
            TRACKS.find((t) => t.id === "mula-freestyle")?.src || "/images/mula-dinner-cover.jpg"
          }
          href={TRACKS.find((t) => t.id === "mula-freestyle")?.href}
          fixedCheckoutTrack={fixedCheckoutTrack}
          onClose={() => {
            window.history.replaceState({}, document.title, window.location.pathname);
            setPlayParam(null);
            setShowStayConnected(false);
          }}
          handleDownloadClick={handleDownloadClick}
        />
      )}

      <div className="w-full grid grid-cols-2 lg:grid-cols-3">
        {TRACKS.map((t) => {
          const isCurrent = currentTrack?.id === t.id;
          const isPlayable = PLAYABLE_TRACK_IDS.has(t.id);
          const isDownloadable = DOWNLOADABLE_TRACK_IDS.has(t.id);
          const highlight = playMula && t.id === "mula-freestyle";

          return (
            <div
              key={t.id}
              className={`relative overflow-hidden aspect-square group cursor-pointer ${
                highlight ? "ring-4 ring-yellow-400" : ""
              }`}
              onClick={() => isPlayable && handlePlayTrack(t.id)}
            >
              <Image
                alt={t.title}
                src={t.src}
                fill
                className="object-cover absolute inset-0"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, 33vw"
              />

              {isPlayable && isCurrent && (
                <div className="absolute top-2 right-2 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center">
                  <div
                    className={`w-3 h-3 bg-white rounded-full ${isPlaying ? "animate-pulse" : ""}`}
                  />
                </div>
              )}

              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center p-4">
                <div className="w-full flex flex-col gap-2">
                  {isPlayable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayTrack(t.id);
                      }}
                      className={`w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded font-medium shadow-lg`}
                    >
                      {isCurrent && isPlaying ? "PAUSE" : "PLAY"}
                    </button>
                  )}
                  {isDownloadable && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadClick(t.id);
                      }}
                      disabled={fixedCheckoutTrack === t.id}
                      className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium shadow-lg disabled:opacity-70"
                    >
                      {fixedCheckoutTrack === t.id ? "..." : "DOWNLOAD"}
                    </button>
                  )}
                  {t.href && (
                    <Link
                      href={t.href}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="w-full py-2 bg-white/90 text-black rounded font-medium shadow-lg flex items-center justify-center gap-2"
                    >
                      STREAM <ArrowIcon />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={() => setPaymentModal((p) => ({ ...p, isOpen: false }))}
        trackId={paymentModal.trackId}
        trackTitle={paymentModal.trackTitle}
        trackThumbnail={paymentModal.trackThumbnail}
      />
    </>
  );
}
