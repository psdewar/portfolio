import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "../../shared/admin-auth";
import { getShowBySlug } from "../../../lib/shows";
import { getAttendees } from "../../../lib/eventbrite";
import { upsertRsvp } from "../../../lib/rsvp";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const maxDuration = 60;

async function resolve(request: NextRequest, slug: string | null) {
  if (!(await isAdminAuthorized(request))) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!slug) return { error: NextResponse.json({ error: "slug required" }, { status: 400 }) };
  const show = await getShowBySlug(slug);
  if (!show?.eventbriteId) {
    return { error: NextResponse.json({ error: "No Eventbrite event for this show" }, { status: 404 }) };
  }
  return { eventbriteId: show.eventbriteId };
}

// Sync an Eventbrite event's registrants into Supabase (stay-connected + rsvps),
// writing only rows that are new or whose guest count changed — so re-running is
// cheap and idempotent. Email + guests only; names are left untouched. The manage
// modal fires this on open, so there's no manual save step.
export async function POST(request: NextRequest) {
  const { slug } = await request.json().catch(() => ({}));
  const { error, eventbriteId } = await resolve(request, slug);
  if (error) return error;

  const attendees = await getAttendees(eventbriteId!);
  const ebGuests = new Map<string, number>();
  for (const a of attendees) {
    const email = (a.email || "").trim().toLowerCase();
    if (!email) continue;
    ebGuests.set(email, (ebGuests.get(email) || 0) + 1);
  }

  const { data: rows } = await supabaseAdmin
    .from("rsvps")
    .select("email, guests")
    .eq("show_slug", slug);
  const existing = new Map(
    (rows || []).map((r) => [(r.email || "").trim().toLowerCase(), r.guests ?? 1]),
  );

  let synced = 0;
  for (const [email, guests] of ebGuests) {
    if (existing.get(email) === guests) continue; // already up to date
    try {
      await upsertRsvp({ email, slug, guests });
      synced += 1;
    } catch (e) {
      console.error("[import-eventbrite] upsert failed for", email, e);
    }
  }

  return NextResponse.json({ total: ebGuests.size, synced });
}
