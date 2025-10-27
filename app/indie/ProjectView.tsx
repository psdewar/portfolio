"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { DualVideoImageToggle } from "app/components/DualVideoImageToggle";
import { FundingCard } from "app/components/projects/FundingCard";
import { SuccessModal } from "app/components/SuccessModal";
import { VideoProvider } from "app/contexts/VideoContext";
import Link from "next/link";
import { ArrowIcon } from "app/ArrowIcon";

export interface ProjectData {
  slug: string;
  title: string;
  tagline: string;
  goalCents: number;
  storyWhat: string;
  contributeTitle?: string;
  [key: string]: any;
}

interface FundingStats {
  raisedCents: number;
  backers: number;
  tierCounts: Record<string, number>;
}

// Hook to read initial state from URL once on mount
function useInitialFromURL() {
  const [initial, setInitial] = useState<{ size: string; color: string }>({
    size: "M",
    color: "black",
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setInitial({
      size: params.get("size") ?? "M",
      color: params.get("color") ?? "black",
    });
  }, []);

  return initial;
}

export function ProjectView({
  project,
  stats,
  success,
  sessionId,
}: {
  project: ProjectData;
  stats: FundingStats;
  success?: boolean;
  sessionId?: string | null;
}) {
  const [showSuccess, setShowSuccess] = useState(!!success);

  // 1) Read initial values from URL once on mount
  const init = useInitialFromURL();

  // 2) Use local state for instant updates
  const [selectedSize, setSelectedSize] = useState(init.size);
  const [selectedColor, setSelectedColor] = useState(init.color);

  // 3) Sync local state with URL initial values
  useEffect(() => {
    setSelectedSize(init.size);
    setSelectedColor(init.color);
  }, [init.size, init.color]);

  // Memoized arrays to prevent recreation
  const sizes = useMemo(() => ["S", "M", "L"], []);
  const colors = useMemo(
    () => [
      { name: "Black", value: "black" },
      { name: "White", value: "white" },
    ],
    []
  );

  // 4) Mirror to URL without triggering navigation
  const mirrorURL = useCallback((updates: { size?: string; color?: string }) => {
    const url = new URL(window.location.href);
    if (updates.size) url.searchParams.set("size", updates.size);
    if (updates.color) url.searchParams.set("color", updates.color);
    // Use replaceState to avoid route transitions
    window.history.replaceState({}, "", url.toString());
  }, []);

  // 5) Handlers that update local state + URL

  return (
    <VideoProvider>
      <div className="lg:flex lg:justify-center mb-32">
        <div className="max-w-2xl px-4">
          {/* <div className="prose-neutral dark:prose-invert"> */}
          {showSuccess && (
            <SuccessModal
              show={showSuccess}
              onClose={() => {
                setShowSuccess(false);
                // remove query params without full reload
                const url = new URL(window.location.href);
                url.searchParams.delete("success");
                url.searchParams.delete("session_id");
                window.history.replaceState({}, "", url.toString());
              }}
              amountCents={undefined}
              sessionId={sessionId || null}
            />
          )}
          <div className="block lg:hidden mb-6">
            <FundingCard
              raisedCents={stats.raisedCents}
              goalCents={project.goalCents}
              backers={stats.backers}
              tierCounts={stats.tierCounts}
              title={project.title}
              projectId={project.slug}
              contributeTitle={project.contributeTitle || null}
              details={project.details}
              stretch={project.stretch || null}
            />
          </div>
          <div className="md:hidden flex flex-col items-center gap-4">
            <Link
              title="SoundBetter"
              aria-label="SoundBetter"
              href={"https://soundbetter.com/profiles/630479-peyt-spencer"}
              className="w-full sm:flex-1 inline-flex items-center gap-1 px-4 py-2 bg-soundbetter text-white rounded-md font-medium hover:bg-soundbetter/80 text-lg pointer-events-auto"
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="inline-flex items-center gap-2">
                Feature me on your next song <ArrowIcon />
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
            {/* <div className="lg:col-span-2 flex flex-col">
              <div className="text-left mb-6">
                <h1 className="text-4xl font-semibold text-gray-900 dark:text-white mb-2">
                  {project.title}
                </h1>
                <p className="text-base lg:text-xl text-gray-600 dark:text-gray-300">
                  {project.tagline}
                </p>
              </div>
              <div className="mb-6">
                <DualVideoImageToggle
                  left={{ src: "/images/home/mb1.jpeg", alt: "Mark Battles artist photo" }}
                  right={{
                    src: "/images/home/new-era-3-square.jpeg",
                    alt: "Peyt Spencer artist photo",
                  }}
                  videoSrc="/boise-fund-60sec.mp4"
                  videoId="boise-fund"
                />
              </div>
              <div className="flex flex-col">
                <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
                  Thanks for your support
                </h3>
                <p className="text-base lg:text-xl text-gray-700 dark:text-gray-300 max-w-none">
                  {project.storyWhat}
                </p>
              </div>
            </div> */}
            <div className="hidden lg:flex justify-center">
              <div className="sticky top-6">
                <FundingCard
                  raisedCents={stats.raisedCents}
                  goalCents={project.goalCents}
                  backers={stats.backers}
                  tierCounts={stats.tierCounts}
                  title={project.title}
                  projectId={project.slug}
                  contributeTitle={project.contributeTitle || null}
                  details={project.details}
                  stretch={project.stretch || null}
                />
              </div>
            </div>
          </div>
        </div>
        {/* </div> */}
      </div>
    </VideoProvider>
  );
}
