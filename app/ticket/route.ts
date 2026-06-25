import { NextResponse } from "next/server";
import { getUpcomingShows } from "../lib/shows";

export async function GET() {
  const shows = await getUpcomingShows();
  const next = shows.find((s) => s.visibility !== "private");
  const target = next ? `/ticket/${next.slug}` : "/rsvp";
  return new NextResponse(null, { status: 307, headers: { Location: target } });
}
