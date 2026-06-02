import { NextRequest, NextResponse } from "next/server";
import { getShows } from "../../../lib/shows";
import { syncShowAttendees } from "../../../lib/eventbrite-sync";

export const maxDuration = 60;

const SYNC_TOKEN = process.env.SCHEDULE_API_TOKEN;

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!SYNC_TOKEN || auth !== `Bearer ${SYNC_TOKEN}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shows = await getShows();
  const synced: Record<string, number> = {};
  for (const show of shows) {
    if (!show.eventbriteId) continue;
    try {
      synced[show.slug] = await syncShowAttendees(show);
    } catch (e) {
      console.error("[eventbrite/sync]", show.slug, e);
    }
  }
  return NextResponse.json({ ok: true, synced });
}
