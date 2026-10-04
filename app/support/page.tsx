import { Suspense } from "react";
import TipsAndSocials from "./TipsAndSocials";
import { SupporterSection } from "../components/SupporterSection";
import {
  getShows,
  isShowDraft,
  needsHostLocation,
  isShowUpcoming,
  isShowCompleted,
  getTourConcertCount,
  listableShows,
} from "../lib/shows";
import { confirmPath } from "../lib/confirm";
import { getCityZone } from "../lib/city-zone";

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
  const liveShows = listableShows(shows);
  const upcomingShows = liveShows.filter(isShowUpcoming);
  const pastShows = liveShows.filter(
    (s) => isShowCompleted(s) && !isShowUpcoming(s),
  );
  const concertCount = getTourConcertCount(shows);
  const draft = shows.find((s) => isShowDraft(s) && needsHostLocation(s));
  const sponsorHref = draft ? confirmPath(draft.slug) : undefined;
  const nextShow = upcomingShows.find((s) => !needsHostLocation(s));
  const nextStop = nextShow
    ? `${nextShow.city}, ${nextShow.region}`
    : undefined;
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
