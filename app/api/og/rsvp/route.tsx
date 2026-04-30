import { getUpcomingShows } from "../../../lib/shows";
import { fallbackResponse, screenshotPoster } from "./shared";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  const shows = await getUpcomingShows();
  if (shows.length === 0) return fallbackResponse();
  return screenshotPoster(shows[0]);
}
