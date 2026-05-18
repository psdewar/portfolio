"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { PostHogProvider } from "./components/PostHogProvider";
import { AudioProvider } from "./contexts/AudioContext";
import { VideoProvider } from "./contexts/VideoContext";
import { DevToolsProvider } from "./contexts/DevToolsContext";
import { ToastProvider } from "./contexts/ToastContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Footer } from "./components/Footer";
import { useAudio } from "./contexts/AudioContext";
import { TRACK_DATA } from "./data/tracks";
import { isPatronTrack } from "./data/patron-config";
import { usePatronStatus } from "./hooks/usePatronStatus";
import SingleOverlay from "./components/SingleOverlay";

const Navbar = dynamic(() => import("./Navbar").then((mod) => mod.Navbar), { ssr: false });
const GlobalAudioPlayer = dynamic(
  () => import("./components/GlobalAudioPlayer").then((mod) => mod.GlobalAudioPlayer),
  { ssr: false },
);
const MissingResourceIndicator = dynamic(
  () => import("./components/MissingResourceIndicator").then((mod) => mod.MissingResourceIndicator),
  { ssr: false },
);
const DevToolsPanel = dynamic(
  () => import("./components/DevToolsPanel").then((mod) => mod.DevToolsPanel),
  { ssr: false },
);

function SiteTools() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
      <MissingResourceIndicator />
      <DevToolsPanel />
    </>
  );
}

function OverlayManager() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const router = useRouter();
  const { loadTrack, setPlaylist, playlist } = useAudio();
  const isPatron = usePatronStatus();

  const overlayTrackId = searchParams?.get("play") ?? null;
  const trackIndex = overlayTrackId ? TRACK_DATA.findIndex((t) => t.id === overlayTrackId) : -1;
  const overlayTrackData = trackIndex >= 0 ? TRACK_DATA[trackIndex] : null;
  const hasPrevNext = TRACK_DATA.length > 1 && trackIndex >= 0;
  const prevTrackData = hasPrevNext
    ? TRACK_DATA[(trackIndex - 1 + TRACK_DATA.length) % TRACK_DATA.length]
    : null;
  const nextTrackData = hasPrevNext
    ? TRACK_DATA[(trackIndex + 1) % TRACK_DATA.length]
    : null;

  const isOgMode = searchParams?.get("og") === "true";
  const isAdminPage = pathname.startsWith("/admin");

  useEffect(() => {
    const playable = TRACK_DATA
      .filter((t) => (t.source ?? "hosted") === "hosted" && (!isPatronTrack(t.id) || isPatron))
      .map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        src: t.audioUrl,
        thumbnail: t.thumbnail,
        duration: t.duration,
      }));
    if (playable.length) setPlaylist(playable);
  }, [isPatron, setPlaylist]);

  useEffect(() => {
    if (!overlayTrackData) return;
    const isHosted = (overlayTrackData.source ?? "hosted") === "hosted";
    const isGated = isPatronTrack(overlayTrackData.id) && !isPatron;
    if (!isHosted || isGated) return;
    loadTrack(
      {
        id: overlayTrackData.id,
        title: overlayTrackData.title,
        artist: overlayTrackData.artist,
        src: overlayTrackData.audioUrl,
        thumbnail: overlayTrackData.thumbnail,
        duration: overlayTrackData.duration,
      },
      true,
    );
  }, [overlayTrackId, isPatron, loadTrack]);

  if (!overlayTrackData || isOgMode || isAdminPage) return null;

  const openOverlayTrack = (trackId: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("play", trackId);
    router.push(`${pathname}?${params.toString()}`);
  };

  const closeOverlay = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("play");
    const search = params.toString();
    router.replace(pathname + (search ? `?${search}` : ""));
  };

  return (
    <SingleOverlay
      trackId={overlayTrackData.id}
      coverSrc={overlayTrackData.thumbnail}
      artworkPending={overlayTrackData.artworkPending}
      prevCoverSrc={prevTrackData?.thumbnail}
      nextCoverSrc={nextTrackData?.thumbnail}
      onPrev={hasPrevNext && prevTrackData ? () => openOverlayTrack(prevTrackData.id) : undefined}
      onNext={hasPrevNext && nextTrackData ? () => openOverlayTrack(nextTrackData.id) : undefined}
      onClose={closeOverlay}
    />
  );
}

type SiteShellProps = {
  children: React.ReactNode;
  mainClassName?: string;
  showFooter?: boolean;
  bare?: boolean;
};

function SiteShell({ children, mainClassName, showFooter, bare }: SiteShellProps) {
  const base = mainClassName ?? "flex-auto min-w-0 flex flex-col";

  if (bare) {
    return (
      <>
        <Navbar />
        <div style={{ paddingBottom: "var(--player-h, 0px)" }}>
          <Suspense>{children}</Suspense>
        </div>
        <GlobalAudioPlayer />
        <SiteTools />
      </>
    );
  }
  return (
    <>
      <Navbar />
      <main className={base} style={{ paddingBottom: "var(--player-h, 0px)" }}>
        <Suspense>{children}</Suspense>
      </main>
      {showFooter && <Footer />}
      <GlobalAudioPlayer />
      <SiteTools />
    </>
  );
}

function ClientLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const isOgMode = searchParams?.get("og") === "true";
  const isAdminPage = pathname?.startsWith("/admin");
  const isHomePage = pathname === "/" || pathname === "/2026";

  if (isOgMode || isAdminPage) {
    return (
      <main className="flex-auto min-w-0 flex flex-col">
        <Suspense>{children}</Suspense>
      </main>
    );
  }

  if (isHomePage) {
    return (
      <>
        <div className="h-[100dvh] overflow-hidden">
          <Suspense>{children}</Suspense>
        </div>
        <SiteTools />
      </>
    );
  }

  if (pathname === "/support") {
    return <SiteShell bare>{children}</SiteShell>;
  }

  if (pathname === "/live" || pathname === "/listen") {
    return <SiteShell>{children}</SiteShell>;
  }

  return <SiteShell showFooter>{children}</SiteShell>;
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <DevToolsProvider>
        <AudioProvider>
          <VideoProvider>
            <ToastProvider>
              <Suspense>
                <OverlayManager />
                <ClientLayoutInner>{children}</ClientLayoutInner>
              </Suspense>
            </ToastProvider>
          </VideoProvider>
        </AudioProvider>
      </DevToolsProvider>
    </PostHogProvider>
  );
}
