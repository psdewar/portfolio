import type { Leg } from "../fund/legs-shared";
import { regionColloquial } from "./region-colloquial";
import {
  type Show,
  getTourConcertCount,
  getTourCityCount,
  isShowUpcoming,
  listableShows,
  needsHostLocation,
} from "./shows-shared";

export const concertLine = (count: number, cities: number) =>
  `${count} concerts across ${cities} cities since Mar '26`;

export const nextStopLine = (stop: string) => `Next stop: ${stop}`;

export function tourMomentum(
  shows: Show[],
  legs: Leg[],
  afterSlug?: string,
): { concertCount: number; cityCount: number; nextStop: string | null } {
  const upcoming = listableShows(shows).filter(isShowUpcoming);
  const next = upcoming.find((s) => s.slug !== afterSlug && !needsHostLocation(s));
  return {
    concertCount: getTourConcertCount(shows),
    cityCount: getTourCityCount(shows),
    nextStop: next
      ? (legs.find((l) => l.slug === next.leg)?.fund?.destination ??
        regionColloquial(next.city, next.region))
      : null,
  };
}
