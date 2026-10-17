import {
  type Show,
  getTourConcertCount,
  isShowUpcoming,
  listableShows,
  needsHostLocation,
} from "./shows-shared";

export const concertLine = (count: number) =>
  `${count} concerts since Mar '26 · hundreds of participants`;

export const nextStopLine = (stop: string) => `Next stop: ${stop}`;

export function tourMomentum(
  shows: Show[],
  afterSlug?: string,
): { concertCount: number; nextStop: string | null } {
  const upcoming = listableShows(shows).filter(isShowUpcoming);
  const next = upcoming.find((s) => s.slug !== afterSlug && !needsHostLocation(s));
  return {
    concertCount: getTourConcertCount(shows),
    nextStop: next ? `${next.city}, ${next.region}` : null,
  };
}
