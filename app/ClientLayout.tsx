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
  const isOgMode = searchParams?.get("og") === "true";
  const isShopSimpleMode = pathname === "/shop" && searchParams?.get("mode") !== "full";

  // OG mode or Shop simple mode: render only the content, no navbar/player/devtools
  if (isOgMode || isShopSimpleMode) {
    return (
      <main className="flex-auto min-w-0 flex flex-col">
        <Suspense>{children}</Suspense>
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main className="flex-auto min-w-0 flex flex-col pb-24 lg:pb-32">
        <Suspense>{children}</Suspense>
        <Analytics />
        <SpeedInsights />
      </main>
      <div className="h-24 lg:h-32">
        <GlobalAudioPlayer />
      </div>
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
