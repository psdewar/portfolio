import { cache } from "react";
import { doorTimeMinutes } from "./dates";
import { getJourneyEvents, type TimelineEvent } from "../data/timeline";
import { chorusRead } from "./chorus";
import { getDataMode } from "./dev-data/mode";
import { fixtureShowFor } from "./dev-data/fixtures";
import type { TourCounts } from "../data/story";
import {
  type Show,
  isShowUpcoming,
  isShowListed,
  isShowListable,
  isShowCompleted,
  isTourConcert,
  showsToTimelineEvents,
} from "./shows-shared";

export * from "./shows-shared";

const LEG_ALIASES: Record<string, string> = { carolinas: "south-carolina" };

const plainBahai = <T extends string | null | undefined>(text: T): T =>
  (text?.replace(/Bah[áa][’'ʼ][íi]/g, "Baha'i") ?? text) as T;

export const getShows = cache(async (): Promise<Show[]> => {
  const res = await chorusRead("shows");
  if (!res.ok) return [];
  const shows: Show[] = await res.json();
  return shows.map((s) => ({
    ...s,
    leg: s.leg && LEG_ALIASES[s.leg] ? LEG_ALIASES[s.leg] : s.leg,
    venue: plainBahai(s.venue),
    venueLabel: plainBahai(s.venueLabel),
  }));
});

export async function getUpcomingShows(): Promise<Show[]> {
  const shows = await getShows();
  return shows
    .filter(isShowUpcoming)
    .filter(isShowListed)
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        doorTimeMinutes(a.doorTime) - doorTimeMinutes(b.doorTime),
    );
}

export async function getShowBySlug(slug: string): Promise<Show | null> {
  const mode = await getDataMode();
  if (mode !== "demo") return fixtureShowFor(slug, mode);
  const shows = await getShows();
  return shows.find((s) => s.slug === slug) || null;
}

export async function getTourCounts(): Promise<TourCounts> {
  const done = (await getShows()).filter(isTourConcert);
  return {
    shows: done.length,
    cities: new Set(done.map((s) => `${s.city}|${s.region}`)).size,
  };
}

export async function getShowHistory(): Promise<TimelineEvent[]> {
  const shows = await getShows();
  const past = shows.filter((s) => isShowListable(s) && isShowCompleted(s));
  return [...showsToTimelineEvents(past), ...getJourneyEvents().filter((e) => e.type === "show")].sort(
    (a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1),
  );
}
