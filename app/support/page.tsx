import { Suspense } from "react";
import TipsAndSocials, { SocialSection } from "./TipsAndSocials";
import { SupporterSection } from "../components/SupporterSection";
import {
  getShows,
  isShowListable,
  isShowDraft,
  needsHostLocation,
  isShowUpcoming,
  isShowCompleted,
  getTourConcertCount,
} from "../lib/shows";
import { confirmPath } from "../lib/confirm";

const REGION_TZ: Record<string, string> = {
  BC: "America/Vancouver",
  AB: "America/Edmonton",
  SK: "America/Regina",
  MB: "America/Winnipeg",
  ON: "America/Toronto",
  QC: "America/Toronto",
  NB: "America/Halifax",
  NS: "America/Halifax",
  PE: "America/Halifax",
  NL: "America/St_Johns",
};

function getTodayInTz(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ now?: string }>;
}) {
  const params = await searchParams;
  const shows = await getShows();
  const liveShows = shows
    .filter(isShowListable)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const upcomingShows = liveShows.filter(isShowUpcoming);
  const pastShows = liveShows.filter((s) => isShowCompleted(s) && !isShowUpcoming(s));
  const concertCount = getTourConcertCount(shows);
  const draft = shows.find((s) => isShowDraft(s) && needsHostLocation(s));
  const sponsorHref = draft ? confirmPath(draft.slug) : undefined;
  const todayShow = liveShows.find((s) => {
    if (s.country !== "CA") return false;
    if (params.now) return params.now === s.date;
    const tz = REGION_TZ[s.region] ?? "America/Vancouver";
    return getTodayInTz(tz) === s.date;
  });

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950">
      <SupporterSection
        upcomingShows={upcomingShows}
        pastShows={pastShows}
        ask={
          <Suspense>
            <TipsAndSocials
              interacFirst={!!todayShow}
              sponsorHref={sponsorHref}
              concertCount={concertCount}
            />
          </Suspense>
        }
      >
        <section id="find-me" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 split:pb-0 split:px-0 split:max-w-none split:mx-0 scroll-mt-20">
          <div className="max-w-lg mx-auto split:max-w-none split:mx-0">
            <SocialSection />
          </div>
        </section>
      </SupporterSection>
    </div>
  );
}
