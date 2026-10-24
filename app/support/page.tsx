import { Suspense } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { NEAR_SHOW_KM, distanceKm, pickTodayShow } from "../lib/checkin-show";
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
import { getCityCoords, getCityZone } from "../lib/city-zone";
import { storyParagraphs } from "../data/story";

function getTodayInTz(tz: string): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: tz });
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined> & { now?: string; og?: string }>;
}) {
  const params = await searchParams;
  const og = params.og === "true";
  const shows = await getShows();
  if (!og && !params.now) {
    const nearShow = pickTodayShow(shows);
    const h = await headers();
    const lat = parseFloat(h.get("x-vercel-ip-latitude") ?? "");
    const lon = parseFloat(h.get("x-vercel-ip-longitude") ?? "");
    const coords =
      nearShow && !Number.isNaN(lat) && !Number.isNaN(lon)
        ? await getCityCoords(nearShow.city, nearShow.region, nearShow.country)
        : null;
    if (nearShow && coords && distanceKm({ latitude: lat, longitude: lon }, coords) <= NEAR_SHOW_KM) {
      const slug = nearShow.slug;
      const query = new URLSearchParams();
      for (const [k, v] of Object.entries(params)) for (const x of [v ?? []].flat()) query.append(k, x);
      query.set("open", "fund");
      redirect(`/checkin/${slug}?${query}`);
    }
  }
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
