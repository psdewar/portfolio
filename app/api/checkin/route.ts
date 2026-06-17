import { NextResponse } from "next/server";
import { getShowBySlug, isCheckinLive } from "../../lib/shows";
import { isEmailValid } from "../../lib/email";
import { markAttended } from "../../lib/rsvp";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";
import PostHogClient from "../../../lib/posthog";

export async function POST(request: Request) {
  try {
    // Generous per-IP cap: a venue shares one NAT'd IP, so high enough for a full room, not a bot.
    const rate = checkRateLimit(getClientIP(request), "checkin", {
      windowMs: 60 * 60 * 1000,
      maxRequests: 100,
    });
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "Too many check-ins from this network. Try again shortly." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rate.resetIn / 1000)) } },
      );
    }

    const { slug, email, name, website } = await request.json();

    // Honeypot: a hidden field only bots fill, so bail without touching the DB.
    if (website) {
      return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 400 });
    }

    if (!email?.trim() || !isEmailValid(email.trim())) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (!slug?.trim()) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const show = await getShowBySlug(slug.trim());
    if (!show || !isCheckinLive(show)) {
      return NextResponse.json({ error: "Check-in isn't open for this show." }, { status: 400 });
    }

    const { number, rsvpd } = await markAttended({ email, name, slug: slug.trim() });

    const posthog = PostHogClient();
    posthog.capture({
      distinctId: email.trim().toLowerCase(),
      event: "rsvp_attended",
      properties: { event_id: slug.trim(), rsvpd },
    });
    await posthog.shutdown();

    return NextResponse.json({ success: true, ticketNo: number, rsvpd });
  } catch (error) {
    console.error("[CHECKIN] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
