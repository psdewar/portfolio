"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  WaveformIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  DownloadSimpleIcon,
} from "@phosphor-icons/react";
import singles from "../../data/singles.json";
import BlockVisualizer from "app/components/BlockVisualizer";
import { useAudio } from "../contexts/AudioContext";
import { useSimulatedLoading } from "../contexts/DevToolsContext";
import { TRACK_DATA } from "../data/tracks";
import { SUPPORTER_CONFIG, SUPPORTER_COPY, SUPPORTER_EXCLUSIVE_TRACKS } from "../data/supporter-config";
import { useSupporterStatus } from "../hooks/useSupporterStatus";
import { claimSupporterSession, claimSupporterLink } from "../lib/supporter";
import posthog from "posthog-js";
import StayConnected, { FORM_SURFACE, shouldShowStayConnected } from "app/components/StayConnected";
import SocialButtons from "app/components/SocialButtons";
import SupportModal from "app/components/SupportModal";
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

const SUPPORTER_TRACKS: TrackCard[] = SUPPORTER_CONFIG.earlyAccess.trackIds.map((id) => {
  const track = TRACK_DATA.find((t) => t.id === id)!;
  return { id, title: track.title, src: track.thumbnail };
});

const ARTWORK_PENDING = new Set(
  TRACK_DATA.filter((t) => t.artworkPending).map((t) => t.id),
);
const WELCOME_PACK_IDS = SUPPORTER_EXCLUSIVE_TRACKS;

const UNSORTED_TRACKS: TrackCard[] = [...SUPPORTER_TRACKS, ...EXTRA_TRACKS, ...BASE_TRACKS];
const BEST_FOOT_FORWARD_TRACK = UNSORTED_TRACKS.find((t) => t.id === "best-foot-forward");
const ALL_TRACKS: TrackCard[] = BEST_FOOT_FORWARD_TRACK
  ? UNSORTED_TRACKS.filter((t) => t !== BEST_FOOT_FORWARD_TRACK).flatMap((t) =>
      t.id === "mula-freestyle" ? [BEST_FOOT_FORWARD_TRACK, t] : [t],
    )
  : UNSORTED_TRACKS;
const ALL_VISIBLE_TRACKS: TrackCard[] = ALL_TRACKS.filter((t) => !t.hidden);

const PLAYABLE_TRACK_IDS = new Set(
  TRACK_DATA.filter((t) => (t.source ?? "hosted") === "hosted").map((t) => t.id),
);

export default function Page() {
  const { loadPlaylist, currentTrack, loadingTrack, playlist } = useAudio();
  const router = useRouter();
  const isSimulatingLoad = useSimulatedLoading();
  const isSupporter = useSupporterStatus();
  const [showStayConnected, setShowStayConnected] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [previewTrack, setPreviewTrack] = useState<{ title: string; src: string } | null>(null);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());
  const [suppressHoverId, setSuppressHoverId] = useState<string | null>(null);
  const [supporterWelcome, setSupporterWelcome] = useState(false);
  const [welcomeFromCheckout, setWelcomeFromCheckout] = useState(false);
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");

    if (params.get("supporter_welcome") === "1") {
      const email = params.get("email");
      const sig = params.get("sig");
      const sessionId = params.get("session_id");
      const isEmailLink = !!(email && sig);
      window.history.replaceState({}, "", "/listen");

      const claimWelcome = async () => {
        const activated = isEmailLink
          ? await claimSupporterLink(email, sig)
          : await claimSupporterSession(sessionId);
        if (activated) {
          setWelcomeFromCheckout(!isEmailLink);
          setSupporterWelcome(true);
        }
      };
      claimWelcome();
      return;
    }

    const SUCCESS_MESSAGES: Record<string, string> = {
      rsvp: "You're in. Check your email for details.",
      rsvp_music: "You're in + music on the way. Check your email.",
      funded: "Contribution received. Thank you.",
      supporter_live: "Thank you for supporting.",
    };

    const message = success ? SUCCESS_MESSAGES[success] : null;
    if (!message) return;

    toast.show(message, 5000);
    window.history.replaceState({}, "", "/listen");
  }, [toast]);

  const visibleTracks = ALL_VISIBLE_TRACKS;

  useEffect(() => {
    setShowStayConnected(shouldShowStayConnected());
  }, []);
  useEffect(() => {
    if (playlist.length === 0 && !currentTrack && !loadingTrack) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlPlayParam = urlParams.get("play");
      if (urlPlayParam && PLAYABLE_TRACK_IDS.has(urlPlayParam)) {
        return;
      }
      const playable = TRACK_DATA
        .filter((t) => (t.source ?? "hosted") === "hosted")
        .map((t) => ({
          id: t.id,
          title: t.title,
          artist: t.artist,
          src: t.audioUrl,
          thumbnail: t.thumbnail,
          duration: t.duration,
        }));
      const startIdx = Math.max(0, playable.findIndex((t) => t.id === "patience"));
      if (playable.length) {
        loadPlaylist(playable, startIdx);
      }
    }
  }, [loadPlaylist, playlist.length, currentTrack, loadingTrack]);


  if (isSimulatingLoad) {
    return <ListenLoading />;
  }

  const stayConnectedVisible = showStayConnected && !isSupporter;

  return (
    <>
      <SupportModal
        open={showSupportModal}
        onOpenChange={setShowSupportModal}
        preview={previewTrack}
        source="listen"
      />

      {isSupporter && (
        <div className="bg-gradient-to-b from-neutral-900 to-neutral-950 border-b border-neutral-800 py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <h2 className="font-bebas text-2xl text-white">
                  {supporterWelcome ? "You're in. Thank you." : SUPPORTER_COPY.yoursHeading}
                </h2>
                {supporterWelcome && (
                  <p className="text-neutral-400 text-sm mt-1">
                    {welcomeFromCheckout
                      ? "Tap a lock to open your song. A welcome email is on its way."
                      : "Tap a lock to open your song."}
                  </p>
                )}
              </div>
              <a
                href="/api/stripe-portal"
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-400 hover:text-white text-sm underline underline-offset-2 transition-colors"
              >
                Manage subscription
              </a>
            </div>
            <a
              href="/api/download/pack?file=singles-16s-2025"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-400 hover:to-pink-400 text-white rounded-btn font-medium transition-colors"
            >
              <DownloadSimpleIcon size={20} weight="bold" />
              Download Singles & 16s Pack
            </a>
          </div>
        </div>
      )}

      <div className={`w-full ${stayConnectedVisible ? "lg:grid lg:grid-cols-[minmax(0,4fr)_minmax(0,1fr)]" : ""}`}>
      <div className={`w-full isolate grid grid-cols-2 md:grid-cols-3 ${stayConnectedVisible ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}>
        {visibleTracks.map((t, i) => {
          const isCurrent = currentTrack?.id === t.id;
          const isLoadingThis = loadingTrack?.id === t.id;
          const isLockedWelcome = supporterWelcome && WELCOME_PACK_IDS.has(t.id) && !unlockedIds.has(t.id);
          const isUnlocking = unlockingId === t.id;

          return (
            <button
              key={t.id}
              type="button"
              style={{ order: (i + 1) * 2 }}
              onClick={() => {
                setSuppressHoverId(t.id);
                if (isLockedWelcome) {
                  if (unlockingId) return;
                  setUnlockingId(t.id);
                  setTimeout(() => {
                    setUnlockedIds((prev) => new Set(prev).add(t.id));
                    setUnlockingId(null);
                    router.push(`/listen?play=${t.id}`);
                  }, 1500);
                  return;
                }
                if (!isSupporter && WELCOME_PACK_IDS.has(t.id)) {
                  setPreviewTrack({ title: t.title, src: `/audio/${t.id}-preview.mp3` });
                  setShowSupportModal(true);
                  return;
                }
                router.push(`/listen?play=${t.id}`);
              }}
              onPointerLeave={() => {
                if (suppressHoverId === t.id) setSuppressHoverId(null);
              }}
              aria-label={`Open ${t.title}`}
              className={`relative aspect-square overflow-hidden cursor-pointer text-left transition-transform duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-inset${
                suppressHoverId === t.id ? "" : " hover:scale-[1.05] hover:z-[70]"
              }${
                isUnlocking ? " animate-supporter-glow" : ""
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
                  loading={supporterWelcome && WELCOME_PACK_IDS.has(t.id) ? "eager" : "lazy"}
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                  onError={() => setBrokenImages((prev) => new Set(prev).add(t.id))}
                />
              )}

              {(brokenImages.has(t.id) || ARTWORK_PENDING.has(t.id)) && (
                <div className="absolute inset-x-2 bottom-2 z-40 flex flex-col items-start gap-1">
                  {brokenImages.has(t.id) && (
                    <span className="text-sm font-medium text-white/80 line-clamp-2">{t.title}</span>
                  )}
                  {ARTWORK_PENDING.has(t.id) && (
                    <span className="px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white/80 uppercase tracking-wide">
                      Early Listen
                    </span>
                  )}
                </div>
              )}

              {isCurrent && !isLoadingThis && (
                <div className="absolute top-2 right-2 z-10">
                  <BlockVisualizer />
                </div>
              )}

              {isLockedWelcome && (
                <div
                  className={`absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-md backdrop-grayscale${
                    isUnlocking ? " animate-supporter-unlock" : ""
                  }`}
                >
                  {isUnlocking ? (
                    <LockSimpleOpenIcon
                      size={64}
                      weight="bold"
                      className="w-16 h-16 text-[#d4a553] drop-shadow-[0_0_20px_rgba(212,165,83,0.6)]"
                    />
                  ) : (
                    <LockSimpleIcon
                      size={64}
                      weight="bold"
                      className="w-16 h-16 text-[#d4a553] drop-shadow-[0_0_20px_rgba(212,165,83,0.6)]"
                    />
                  )}
                  <span className="text-sm font-medium text-white/90 line-clamp-2">{t.title}</span>
                  <span className="text-xs uppercase tracking-widest text-white/70 font-medium">
                    {isUnlocking ? "Opening" : "Tap to open"}
                  </span>
                </div>
              )}
            </button>
          );
        })}
        {stayConnectedVisible && (
          <section className="col-span-2 md:col-span-full flex justify-center bg-neutral-900 order-[13] lg:hidden">
            <StayConnected onClose={() => setShowStayConnected(false)} />
          </section>
        )}
      </div>
      {stayConnectedVisible && (
        <aside className="hidden lg:block [contain:size]">
          <div
            className="sticky flex flex-col [container-type:inline-size]"
            style={{
              top: "var(--header-h, 0px)",
              width: "min(100%, calc((100dvh - var(--header-h, 0px) - var(--player-h, 0px)) / 2.3))",
              height: "min(100%, calc(100dvh - var(--header-h, 0px)))",
            }}
          >
            <StayConnected onClose={() => setShowStayConnected(false)} />
            <div className="soc-fill flex-1 min-h-0 px-[5.78cqw] pb-[5.78cqw]" style={{ background: FORM_SURFACE }}>
              <SocialButtons showAppleMusic onTap={(platform) => posthog.capture("listen_social_tap", { platform })} />
            </div>
          </div>
        </aside>
      )}
      </div>
    </>
  );
}
