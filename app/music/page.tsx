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
  {
    ssr: false,
  }
);

// Structured data for music content
// const musicStructuredData = {
//   "@context": "https://schema.org",
//   "@type": "MusicPlaylist",
//   name: "Peyt Spencer - Original Tracks",
//   description: "Collection of original hip-hop and R&B tracks by Peyt Spencer",
//   creator: {
//     "@type": "Person",
//     name: "Peyt Spencer Dewar",
//     url: "https://peytspencer.com",
//   },
//   track: TRACK_DATA.map((track) => ({
//     "@type": "MusicRecording",
//     name: track.title,
//     creator: {
//       "@type": "Person",
//       name: track.artist,
//     },
//     duration: track.duration,
//     genre: ["Hip Hop", "R&B"],
//     url: `https://peytspencer.com/music#${track.id}`,
//     offers: {
//       "@type": "Offer",
//       price: "5.00",
//       priceCurrency: "USD",
//       availability: "https://schema.org/InStock",
//     },
//   })),
// };

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

const FIXED_PRICE_DOWNLOADS: Record<string, number> = {
  "mula-freestyle": 100,
};

const PLAYABLE_TRACK_IDS = new Set(["patience", "mula-freestyle"]);
const DOWNLOADABLE_TRACK_IDS = new Set(["patience", "mula-freestyle"]);

export default function Page() {
  const { loadTrack, loadPlaylist, currentTrack, isPlaying, toggle, playlist, play } = useAudio();
  const [showStayConnected, setShowStayConnected] = useState(() => shouldShowStayConnected());
  const [playParam, setPlayParam] = useState<string | null>(null);
  const downloadInitiatedRef = useRef(false);
  const [fixedCheckoutTrack, setFixedCheckoutTrack] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<{
    isOpen: boolean;
    trackId: string;
    trackTitle: string;
    trackThumbnail: string;
  }>({
    isOpen: false,
    trackId: "",
    trackTitle: "",
    trackThumbnail: "",
  });

  // Load playlist with only patience for now
  useEffect(() => {
    if (playlist.length === 0) {
      const patienceTrack = TRACK_DATA.find((track) => track.id === "patience");
      if (patienceTrack) {
        const audioTrack = {
          id: patienceTrack.id,
          title: patienceTrack.title,
          artist: patienceTrack.artist,
          src: patienceTrack.audioUrl,
          thumbnail: patienceTrack.thumbnail,
          duration: patienceTrack.duration,
        };
        loadPlaylist([audioTrack]);
      }
    }
  }, [loadPlaylist, playlist.length]);

  // Read the `play` query param on mount and keep in state
  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    setPlayParam(urlParams.get("play"));
  }, []);

  // Auto-play when `playParam` is set to a valid track id
  useEffect(() => {
    if (!playParam) return;
    // only attempt to play whitelisted playable tracks
    if (!PLAYABLE_TRACK_IDS.has(playParam)) return;

    if (currentTrack?.id === playParam && isPlaying) return;
    void handlePlayTrack(playParam);
  }, [playParam, currentTrack, isPlaying]);

  // Handle successful payment and trigger download
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get("success");
    const sessionId = urlParams.get("session_id");

    // Only process if we have both success flag and a valid Stripe session ID format
    // AND we haven't already initiated a download
    if (
      success === "true" &&
      sessionId &&
      sessionId.startsWith("cs_") &&
      !downloadInitiatedRef.current
    ) {
      // Mark download as initiated to prevent duplicates
      downloadInitiatedRef.current = true;

      // Trigger download
      const downloadTrack = async () => {
        try {
          // First, get session details to find the track ID
          // This will validate the session with Stripe and ensure payment was completed
          const sessionResponse = await fetch(`/api/download/session-info?session_id=${sessionId}`);

          if (!sessionResponse.ok) {
            const errorData = await sessionResponse.json().catch(() => ({}));
            throw new Error(errorData.error || "Failed to verify session");
          }

          const sessionData = await sessionResponse.json();
          const trackId = sessionData.trackId;

          if (!trackId) {
            throw new Error("Track ID not found in session");
          }

          // Validate that payment was actually completed
          if (sessionData.paymentStatus !== "paid") {
            throw new Error("Payment not completed");
          }

          // Now download the track (this also verifies the session server-side)
          const response = await fetch(`/api/download/${trackId}?session_id=${sessionId}`);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Download failed: ${errorText}`);
          }

          // Get the filename from the response headers
          const contentDisposition = response.headers.get("content-disposition");
          const filenameMatch = contentDisposition?.match(/filename="([^"]+)"/);
          const filename = filenameMatch ? filenameMatch[1] : `${trackId}.mp3`;

          alert(`${filename} download successful!`);

          // Create blob and download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          // Clean up URL parameters after successful download
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error("Download failed:", error);

          // Reset flag on error so user can retry if they refresh
          downloadInitiatedRef.current = false;

          // Clean up URL parameters immediately on any error
          window.history.replaceState({}, document.title, window.location.pathname);

          // Show user-friendly error message
          const errorMessage = error instanceof Error ? error.message : "Download failed";
          alert(`${errorMessage}. Please try again or contact support.`);
        }
      };

      downloadTrack();
    } else if (success === "true" || sessionId) {
      // Clean up invalid/incomplete parameters immediately
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handlePlayTrack = async (trackId: string) => {
    // Only allow playback for explicitly whitelisted tracks
    if (!PLAYABLE_TRACK_IDS.has(trackId)) {
      return;
    }

    if (process.env.NODE_ENV === "development") console.log("Attempting to play track:", trackId);
    const trackData = TRACK_DATA.find((t) => t.id === trackId);
    if (!trackData) {
      console.error("Track not found:", trackId);
      return;
    }

    const audioTrack = {
      id: trackData.id,
      title: trackData.title,
      artist: trackData.artist,
      src: trackData.audioUrl,
      thumbnail: trackData.thumbnail,
      duration: trackData.duration,
    };

    if (process.env.NODE_ENV === "development") console.log("Audio track data:", audioTrack);

    // If it's the current track, toggle play/pause
    if (currentTrack?.id === trackId) {
      if (process.env.NODE_ENV === "development") console.log("Toggling current track");
      toggle();
      return;
    }

    if (process.env.NODE_ENV === "development") console.log("Loading new track");
    await loadTrack(audioTrack);
    if (process.env.NODE_ENV === "development") console.log("Track loaded, starting playback");
    play();
  };

  const openPaymentModal = (trackId: string) => {
    const track = TRACKS.find((t) => t.id === trackId);
    if (!track) return;

    setPaymentModal({
      isOpen: true,
      trackId,
      trackTitle: track.title || formatTrackTitle(trackId),
      trackThumbnail: track.src,
    });
  };

  const startFixedPriceCheckout = async (trackId: string) => {
    const amount = FIXED_PRICE_DOWNLOADS[trackId];
    if (!amount) return;

    const trackTitle = TRACKS.find((t) => t.id === trackId)?.title || formatTrackTitle(trackId);

    try {
      setFixedCheckoutTrack(trackId);
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          trackId,
          trackTitle,
          mode: "download",
          currency: "usd",
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload.sessionId) {
        throw new Error(payload.error || "Unable to start checkout");
      }

      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      const { error } = await stripe.redirectToCheckout({ sessionId: payload.sessionId });
      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error ? error.message : "We couldn't start the checkout. Please try again."
      );
    } finally {
      setFixedCheckoutTrack((current) => (current === trackId ? null : current));
    }
  };

  const handleDownloadClick = (trackId: string) => {
    if (FIXED_PRICE_DOWNLOADS[trackId]) {
      void startFixedPriceCheckout(trackId);
      return;
    }
    openPaymentModal(trackId);
  };

  const closePaymentModal = () => {
    setPaymentModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Which track (if any) was requested via ?play=
  const playMula = playParam === "mula-freestyle";

  return (
    <>
      {/* Stay Connected Modal (suppressed when a play param is present) */}
      {showStayConnected && !playParam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <StayConnected isModal onClose={() => setShowStayConnected(false)} />
        </div>
      )}

      {/* Mula overlay component (keeps modal open for play/pause) */}
      {playMula && (
        <FreestyleOverlay
          trackId="mula-freestyle"
          coverSrc={
            TRACKS.find((t) => t.id === "mula-freestyle")?.src || "/images/mula-dinner-cover.jpg"
          }
          href={TRACKS.find((t) => t.id === "mula-freestyle")?.href}
          fixedCheckoutTrack={fixedCheckoutTrack}
          onClose={() => {
            if (typeof window !== "undefined") {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
            setPlayParam(null);
            setShowStayConnected(false);
          }}
          handleDownloadClick={handleDownloadClick}
        />
      )}
      <div className="w-full grid grid-cols-2 lg:grid-cols-3">
        {TRACKS.map((t) => {
          const isCurrentTrack = currentTrack?.id === t.id;
          const isCurrentlyPlaying = isCurrentTrack && isPlaying;
          const isPlayableTrack = PLAYABLE_TRACK_IDS.has(t.id);
          const isDownloadableTrack = DOWNLOADABLE_TRACK_IDS.has(t.id);
          const hasStreamLink = Boolean(t.href);
          const highlight = playMula && t.id === "mula-freestyle";

          return (
            <div
              key={t.id}
              className={`relative overflow-hidden aspect-square group cursor-pointer ${
                highlight ? "ring-4 ring-yellow-400" : ""
              }`}
              onClick={() => (isPlayableTrack ? void handlePlayTrack(t.id) : null)}
            >
              {/* Album art */}
              <Image
                alt={t.title}
                src={t.src}
                fill
                className="object-cover absolute inset-0"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />

              {/* Play state indicator - only for patience and mula-freestyle */}
              {isPlayableTrack && isCurrentTrack && (
                <div className="absolute top-2 right-2 w-8 h-8 bg-black/70 rounded-full flex items-center justify-center">
                  {isCurrentlyPlaying ? (
                    <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  ) : (
                    <div className="w-3 h-3 bg-white rounded-full" />
                  )}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 flex items-center">
                <div className="w-full flex flex-col gap-2 p-4">
                  {isPlayableTrack && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handlePlayTrack(t.id);
                      }}
                      className={`flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded font-medium text-lg transition-colors shadow-lg ${
                        highlight ? "ring-2 ring-yellow-400" : ""
                      }`}
                      aria-label={isCurrentlyPlaying ? `Pause ${t.title}` : `Play ${t.title}`}
                    >
                      {isCurrentlyPlaying ? "PAUSE" : "PLAY"}
                    </button>
                  )}

                  {isDownloadableTrack && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadClick(t.id);
                      }}
                      disabled={fixedCheckoutTrack === t.id}
                      className={`flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-lg transition-colors shadow-lg disabled:opacity-70 disabled:cursor-wait ${
                        highlight ? "ring-2 ring-yellow-400" : ""
                      }`}
                      aria-label={`Download ${t.title}`}
                    >
                      {FIXED_PRICE_DOWNLOADS[t.id]
                        ? fixedCheckoutTrack === t.id
                          ? "Redirecting..."
                          : `$${(FIXED_PRICE_DOWNLOADS[t.id] / 100).toFixed(2)} DOWNLOAD`
                        : "DOWNLOAD"}
                    </button>
                  )}
                  {hasStreamLink ? (
                    <Link
                      href={t.href!}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 py-2 bg-white/90 hover:bg-white text-black rounded font-medium text-lg transition-colors shadow-lg text-center flex items-center justify-center gap-2"
                      aria-label={`Stream ${t.title} externally`}
                    >
                      STREAM <ArrowIcon />
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <PaymentModal
        isOpen={paymentModal.isOpen}
        onClose={closePaymentModal}
        trackId={paymentModal.trackId}
        trackTitle={paymentModal.trackTitle}
        trackThumbnail={paymentModal.trackThumbnail}
      />
    </>
  );
}
