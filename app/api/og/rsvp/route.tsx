import { getUpcomingShows } from "../../../lib/shows";
import { screenshotPoster } from "./shared";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const shows = await getUpcomingShows();
  const path = shows.length > 0 ? `/rsvp/${shows[0].slug}` : "/rsvp";
  return screenshotPoster(path);
}
