"use client";

import { useState } from "react";
import { DualVideoImageToggle } from "app/components/DualVideoImageToggle";
import { FundingCard } from "app/components/projects/FundingCard";
import { SuccessModal } from "app/components/SuccessModal";

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
      <div className="w-full px-6 py-6 pb-12 flex flex-col min-h-screen">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 flex flex-col">
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
                videoSrc="/boise-fund-60sec.mov"
              />
            </div>
            <div className="flex flex-col gap-4">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white text-left">
                Thanks for your support
              </h2>
              <div className="items-center">
                <p className="text-base lg:text-xl text-gray-700 dark:text-gray-300 leading-relaxed max-w-none">
                  {project.storyWhat}
                </p>
              </div>
            </div>
          </div>
          <div className="hidden lg:block">
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
    </main>
  );
}
