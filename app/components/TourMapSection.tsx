import type { Show } from "../lib/shows";
import TourItinerary from "./TourItinerary";
import type { TourStop } from "./TourItinerary";

export default function TourMapSection({ shows }: { shows: Show[] }) {
  const stops: TourStop[] = shows.map((s) => ({
    location: `${s.city}, ${s.region}`,
    date: s.date,
    url: s.visibility === "private" ? undefined : `/rsvp/${s.slug}`,
  }));

  if (stops.length === 0) return null;
  return <TourItinerary stops={stops} />;
}
