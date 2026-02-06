"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { PostHogProvider } from "./components/PostHogProvider";
import { AudioProvider } from "./contexts/AudioContext";
import { VideoProvider } from "./contexts/VideoContext";
import { DevToolsProvider } from "./contexts/DevToolsContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Footer } from "./components/Footer";
import { useAudio } from "./contexts/AudioContext";

const Navbar = dynamic(() => import("./Navbar").then((mod) => mod.Navbar), { ssr: false });
const GlobalAudioPlayer = dynamic(
  () => import("./components/GlobalAudioPlayer").then((mod) => mod.GlobalAudioPlayer),
  { ssr: false }
);
const MissingResourceIndicator = dynamic(
  () => import("./components/MissingResourceIndicator").then((mod) => mod.MissingResourceIndicator),
  { ssr: false }
);
const DevToolsPanel = dynamic(
  () => import("./components/DevToolsPanel").then((mod) => mod.DevToolsPanel),
  { ssr: false }
);

function ClientLayoutInner({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { currentTrack } = useAudio();
  const hasAudioPlayer = !!currentTrack;
  const isOgMode = searchParams?.get("og") === "true";
  const isPatronPage = pathname === "/patron";
  const isHomePage = pathname === "/" || pathname === "/2026";
  const isListenPage = pathname === "/listen";
  const isLivePage = pathname === "/live";

  // OG mode: render only the content, no navbar/player/devtools
  if (isOgMode) {
    return (
      <main className="flex-auto min-w-0 flex flex-col">
        <Suspense>{children}</Suspense>
      </main>
    );
  }

  // Homepage: fullscreen immersive hero, no navbar, no audio player
  if (isHomePage) {
    return (
      <div className="h-dvh overflow-hidden">
        <Suspense>{children}</Suspense>
        <Analytics />
        <SpeedInsights />
        <MissingResourceIndicator />
        <DevToolsPanel />
      </div>
    );
  }

  // Patron page: fullscreen with internal scroll, with audio player
  if (isPatronPage) {
    return (
      <>
        <Navbar />
        <Suspense>{children}</Suspense>
        <GlobalAudioPlayer />
        <Analytics />
        <SpeedInsights />
        <MissingResourceIndicator />
        <DevToolsPanel />
      </>
    );
  }

  // Live page: no footer, edge-to-edge
  if (isLivePage) {
    return (
      <>
        <Navbar />
        <main className="flex-auto min-w-0 flex flex-col">
          <Suspense>{children}</Suspense>
        </main>
        <GlobalAudioPlayer />
        <Analytics />
        <SpeedInsights />
        <MissingResourceIndicator />
        <DevToolsPanel />
      </>
    );
  }

  // Listen page: edge-to-edge grid, no footer, pad only for audio player
  if (isListenPage) {
    return (
      <>
        <Navbar />
        <main className={`flex-auto min-w-0 flex flex-col ${hasAudioPlayer ? "pb-[62px]" : ""}`}>
          <Suspense>{children}</Suspense>
        </main>
        <GlobalAudioPlayer />
        <Analytics />
        <SpeedInsights />
        <MissingResourceIndicator />
        <DevToolsPanel />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-auto min-w-0 flex flex-col pb-20">
        <Suspense>{children}</Suspense>
      </main>
      <Footer />
      <GlobalAudioPlayer />
      <Analytics />
      <SpeedInsights />
      <MissingResourceIndicator />
      <DevToolsPanel />
    </>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <DevToolsProvider>
        <AudioProvider>
          <VideoProvider>
            <Suspense>
              <ClientLayoutInner>{children}</ClientLayoutInner>
            </Suspense>
          </VideoProvider>
        </AudioProvider>
      </DevToolsProvider>
    </PostHogProvider>
  );
}
