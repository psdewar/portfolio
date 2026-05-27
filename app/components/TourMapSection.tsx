import { TIMELINE } from "../data/timeline";
import type { Show } from "../lib/shows";
import TourItinerary from "./TourItinerary";
import type { TourStop } from "./TourItinerary";

export default function TourMapSection({ shows }: { shows: Show[] }) {
  const upcomingStops: TourStop[] = shows.map((s) => ({
    location: `${s.city}, ${s.region}`,
    date: s.date,
    url: s.access === "private" ? undefined : `/rsvp/${s.slug}`,
  }));
  const pastStops: TourStop[] = TIMELINE.filter(
    (e) => e.type === "show" && e.location && e.title.includes("From The Ground Up"),
  ).map((e) => ({ location: e.location!, date: e.date, url: e.url }));

  const seen = new Set<string>();
  const stops = [...upcomingStops, ...pastStops].filter((s) => {
    const key = `${s.location}|${s.date}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (stops.length === 0) return null;
  return <TourItinerary stops={stops} />;
}
