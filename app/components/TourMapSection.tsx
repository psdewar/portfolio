import { TIMELINE } from "../data/timeline";
import TourItinerary from "./TourItinerary";
import type { TourStop } from "./TourItinerary";

export default function TourMapSection() {
  const seen = new Set<string>();
  const stops: TourStop[] = TIMELINE.filter(
    (e) => e.type === "show" && e.location && e.title.includes("From The Ground Up"),
  )
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((e) => {
      if (seen.has(e.location!)) return false;
      seen.add(e.location!);
      return true;
    })
    .map((e) => ({ location: e.location!, date: e.date, url: e.url }));

  if (stops.length === 0) return null;
  return <TourItinerary stops={stops} />;
}
