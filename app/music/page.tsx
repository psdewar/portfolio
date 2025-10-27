"use client";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import singles from "../../data/singles.json";
import { ArrowIcon } from "app/ArrowIcon";
import { useAudio } from "../contexts/AudioContext";
import { TRACK_DATA } from "../data/tracks";
import StayConnected, { shouldShowStayConnected } from "app/components/StayConnected";

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

const TRACKS = singles.filter(Boolean).map((s) => {
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
  };
});

export default function Page() {
  const { loadTrack, loadPlaylist, currentTrack, isPlaying, toggle, playlist } = useAudio();
  const [showStayConnected, setShowStayConnected] = useState(() => shouldShowStayConnected());
  const downloadInitiatedRef = useRef(false);
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
    // Only load patience track for full functionality
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

  const handlePlayTrack = (trackId: string) => {
    // Only allow playing patience
    if (trackId !== "patience") {
      return; // Do nothing for other tracks
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
    } else {
      // Load and play new track
      if (process.env.NODE_ENV === "development") console.log("Loading new track");
      loadTrack(audioTrack);
      // Small delay to ensure audio is loaded
      setTimeout(() => {
        if (process.env.NODE_ENV === "development") console.log("Starting playback after delay");
        toggle();
      }, 500);
    }
  };

  const openPaymentModal = (trackId: string) => {
    const track = TRACKS.find((t) => t.id === trackId);
    if (!track) return;

    setPaymentModal({
      isOpen: true,
      trackId,
      trackTitle: trackId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      trackThumbnail: track.src,
    });
  };

  const closePaymentModal = () => {
    setPaymentModal((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      {/* Stay Connected Modal */}
      {showStayConnected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <StayConnected isModal onClose={() => setShowStayConnected(false)} />
        </div>
      )}
      <div className="w-full grid grid-cols-2 lg:grid-cols-3">
        {TRACKS.map((t) => {
          const isCurrentTrack = currentTrack?.id === t.id;
          const isCurrentlyPlaying = isCurrentTrack && isPlaying;

          // Only patience gets full functionality
          const isPatienceTrack = t.id === "patience";

          return (
            <div
              key={t.href}
              className="relative overflow-hidden aspect-square group cursor-pointer"
              onClick={() => (isPatienceTrack ? handlePlayTrack(t.id) : null)}
            >
              {/* Album art */}
              <Image
                alt={t.id}
                src={t.src}
                fill
                className="object-cover absolute inset-0"
                loading="lazy"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />

              {/* Play state indicator - only for patience */}
              {isPatienceTrack && isCurrentTrack && (
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
                  {isPatienceTrack ? (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayTrack(t.id);
                        }}
                        className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded font-medium text-lg transition-colors shadow-lg"
                        aria-label={isCurrentlyPlaying ? `Pause ${t.id}` : `Play ${t.id}`}
                      >
                        {isCurrentlyPlaying ? "PAUSE" : "PLAY"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openPaymentModal(t.id);
                        }}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded font-medium text-lg transition-colors shadow-lg"
                        aria-label={`Download ${t.id}`}
                      >
                        DOWNLOAD
                      </button>
                    </>
                  ) : null}
                  <Link
                    href={t.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 py-2 bg-white/90 hover:bg-white text-black rounded font-medium text-lg transition-colors shadow-lg text-center flex items-center justify-center gap-2"
                    aria-label={`Stream ${t.id} externally`}
                  >
                    STREAM <ArrowIcon />
                  </Link>
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
