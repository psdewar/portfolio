"use client";

import { useState } from "react";
import { FundingCard } from "app/components/projects/FundingCard";
import { SuccessModal } from "app/components/SuccessModal";
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
    <div className="lg:flex lg:justify-center mb-32">
      <div className="max-w-2xl px-4">
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
    </div>
  );
}
