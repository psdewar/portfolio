"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { FundingCard } from "app/components/projects/FundingCard";
import { SuccessModal } from "app/components/SuccessModal";
import { useAudio } from "app/contexts/AudioContext";
import { TRACK_DATA } from "app/data/tracks";

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
  const { loadPlaylist, playlist } = useAudio();
  const [showSuccess, setShowSuccess] = useState(!!success);

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

  return (
    <main className="min-h-screen transition-colors">
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
      <div className="w-full px-6 py-6 pb-32 flex flex-col">
        <div className="block lg:hidden mb-6">
          <FundingCard
            raisedCents={stats.raisedCents}
            goalCents={project.goalCents}
            backers={stats.backers}
            title={project.title}
            projectId={project.slug}
            contributeTitle={project.contributeTitle || null}
            details={project.details}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col">
            <div className="text-left mb-6">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {project.title}
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">{project.tagline}</p>
            </div>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-0 lg:flex">
              <div className="relative aspect-square lg:flex-1 overflow-hidden rounded-lg lg:rounded-l-lg lg:rounded-r-none min-h-[240px]">
                <Image
                  src="/images/home/mb1.jpeg"
                  alt="Mark Battles artist photo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
              <div className="relative aspect-square lg:flex-1 overflow-hidden rounded-lg lg:rounded-r-lg lg:rounded-l-none min-h-[240px]">
                <Image
                  src="/images/home/new-era-3-square.jpeg"
                  alt="Peyt Spencer artist photo"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
            <FundingCard
              raisedCents={stats.raisedCents}
              goalCents={project.goalCents}
              backers={stats.backers}
              title={project.title}
              projectId={project.slug}
              contributeTitle={project.contributeTitle || null}
              details={project.details}
            />
          </div>
        </div>

        <div className="mt-8 mb-8 flex flex-col">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-left mb-4">
            Thanks for your support
          </h2>
          <div className="items-center">
            <p className="text-xl lg:text-2xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-none">
              {project.storyWhat}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
