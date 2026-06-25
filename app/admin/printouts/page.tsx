import { getUpcomingShows } from "../../lib/shows";
import PrintoutsClient from "./PrintoutsClient";

export default async function PrintoutsPage() {
  const shows = await getUpcomingShows();
  // Check-in only works for public shows, so the ticket targets the next non-private one.
  const ticketShow = shows.find((s) => s.visibility !== "private") ?? null;
  return (
    <PrintoutsClient currentCity={shows[0]?.city ?? null} ticketSlug={ticketShow?.slug ?? null} />
  );
}
