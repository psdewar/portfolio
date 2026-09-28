import LiveClient from "./LiveClient";
import {
  getShowHistory,
  getShows,
  getTourConcertCount,
  isShowUpcoming,
  listableShows,
  needsHostLocation,
  orderedShowsToTimelineEvents,
} from "../lib/shows";
import { getNextStream, getStreamStatus, type StreamPath } from "../lib/live";

const CHORUS_ERA_START = "2026-03-20";

export default async function LivePage({ path }: { path: StreamPath }) {
  const [history, initialStatus, nextStream, shows] = await Promise.all([
    getShowHistory(),
    getStreamStatus(path),
    getNextStream(),
    getShows(),
  ]);

  const listableUpcomingShows = listableShows(shows)
    .filter(isShowUpcoming)
    .filter((s) => !needsHostLocation(s));
  const firstLeg = listableUpcomingShows[0]?.leg;
  const upcomingShows = firstLeg
    ? listableUpcomingShows.filter((s) => s.leg === firstLeg)
    : listableUpcomingShows.slice(0, 3);

  const concertCount = getTourConcertCount(shows);

  const tourPastShows = history.filter((e) => e.date >= CHORUS_ERA_START);

  return (
    <LiveClient
      path={path}
      pastShows={tourPastShows}
      initialStatus={initialStatus}
      nextStream={nextStream}
      upcomingShows={orderedShowsToTimelineEvents(upcomingShows)}
      concertCount={concertCount}
      tripLeg={firstLeg}
    />
  );
}
