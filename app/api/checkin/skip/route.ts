import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getShowBySlug } from "../../../lib/shows";
import {
  CHECKIN_COOKIE,
  isCheckinOpen,
  isShowToday,
  parseCheckinCookie,
  setCheckinCookie,
} from "../../../lib/checkin-show";
import { checkinExists, skipCheckin } from "../../../lib/rsvp";
import { isCheckinId } from "../../shared/checkin-metadata";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit(getClientIP(request), "checkin-skip", {
      windowMs: 60 * 60 * 1000,
      maxRequests: 100,
    });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
    }

    const { slug, website, checkinId: clientId } = await request.json();
    if (website || typeof slug !== "string" || !slug.trim()) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const show = await getShowBySlug(slug.trim());
    if (!show || !isCheckinOpen(show)) {
      return NextResponse.json({ error: "Check-in isn't open for this show." }, { status: 400 });
    }

    const own = parseCheckinCookie(
      request.headers
        .get("cookie")
        ?.split("; ")
        .find((c) => c.startsWith(`${CHECKIN_COOKIE}=`))
        ?.slice(CHECKIN_COOKIE.length + 1),
    );
    const existing = isCheckinId(clientId)
      ? clientId
      : own?.slug === show.slug
        ? own.checkinId
        : null;
    const closedToNew = !isShowToday(show);
    if (closedToNew && (!existing || !(await checkinExists(show.slug, existing)))) {
      return NextResponse.json({ error: "Check-in isn't open for this show." }, { status: 400 });
    }
    const requested = existing ?? randomUUID();
    const { number, checkinId, steps } = await skipCheckin(show.slug, requested);
    const response = NextResponse.json({ success: true, ticketNo: number, checkinId, steps });
    setCheckinCookie(response, show.slug, checkinId);
    return response;
  } catch (error) {
    console.error("[CHECKIN SKIP] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
