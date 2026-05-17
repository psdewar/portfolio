"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import { PostHogProvider } from "./components/PostHogProvider";
import { AudioProvider } from "./contexts/AudioContext";
import { VideoProvider } from "./contexts/VideoContext";
import { DevToolsProvider } from "./contexts/DevToolsContext";
import { ToastProvider } from "./contexts/ToastContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Footer } from "./components/Footer";
import { useAudio } from "./contexts/AudioContext";

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

type SiteShellProps = {
  children: React.ReactNode;
  mainClassName?: string;
  showFooter?: boolean;
  bare?: boolean;
};

function SiteShell({ children, mainClassName, showFooter, bare }: SiteShellProps) {
  if (bare) {
    return (
      <>
        <Navbar />
        <Suspense>{children}</Suspense>
        <GlobalAudioPlayer />
        <SiteTools />
      </>
    );
  }
  return (
    <>
      <Navbar />
      <main className={mainClassName ?? "flex-auto min-w-0 flex flex-col"}>
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
  const { currentTrack } = useAudio();
  const hasAudioPlayer = !!currentTrack && !searchParams?.get("play");
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

  if (pathname === "/live") {
    return <SiteShell>{children}</SiteShell>;
  }

  if (pathname === "/listen") {
    return (
      <SiteShell
        mainClassName={`flex-auto min-w-0 flex flex-col ${hasAudioPlayer ? "pb-[96px] sm:pb-[80px]" : ""}`}
      >
        {children}
      </SiteShell>
    );
  }

  return (
    <SiteShell mainClassName="flex-auto min-w-0 flex flex-col pb-20" showFooter>
      {children}
    </SiteShell>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <DevToolsProvider>
        <AudioProvider>
          <VideoProvider>
            <ToastProvider>
              <Suspense>
                <ClientLayoutInner>{children}</ClientLayoutInner>
              </Suspense>
            </ToastProvider>
          </VideoProvider>
        </AudioProvider>
      </DevToolsProvider>
    </PostHogProvider>
  );
}
