import { Suspense } from "react";
import TipsAndSocials from "./TipsAndSocials";
import { SupporterSection } from "../components/SupporterSection";
import {
  getShows,
  getTourCounts,
  isShowDraft,
  needsHostLocation,
  isShowUpcoming,
  isShowCompleted,
  listableShows,
} from "../lib/shows";
import { tourMomentum } from "../lib/tour-momentum";
import { confirmPath } from "../lib/confirm";
import { getCityZone } from "../lib/city-zone";
import { storyParagraphs } from "../data/story";

function getTodayInTz(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ now?: string; og?: string }>;
}) {
  const params = await searchParams;
  const og = params.og === "true";
  const shows = await getShows();
  const paragraphs = storyParagraphs(await getTourCounts());
  const liveShows = listableShows(shows);
  const upcomingShows = liveShows.filter(isShowUpcoming);
  const pastShows = liveShows.filter(
    (s) => isShowCompleted(s) && !isShowUpcoming(s),
  );
  const { concertCount, nextStop } = tourMomentum(shows);
  const draft = shows.find((s) => isShowDraft(s) && needsHostLocation(s));
  const sponsorHref = draft ? confirmPath(draft.slug) : undefined;
  const caShows = await Promise.all(
    liveShows
      .filter((s) => s.country === "CA")
      .map(async (s) => ({
        show: s,
        tz: (await getCityZone(s.city, s.region, s.country)) ?? "America/Vancouver",
      })),
  );
  const todayShow = caShows.find(({ show, tz }) =>
    params.now ? params.now === show.date : getTodayInTz(tz) === show.date,
  )?.show;

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950">
      <SupporterSection
        upcomingShows={upcomingShows}
        pastShows={pastShows}
        og={og}
        storyParagraphs={paragraphs}
        sponsorHref={sponsorHref}
        ask={
          <Suspense>
            <TipsAndSocials
              interacFirst={!!todayShow}
              concertCount={concertCount}
              nextStop={nextStop}
            />
          </Suspense>
        }
      />
    </div>
  );
}
