import { NextRequest, NextResponse } from "next/server";
import { getShowBySlug } from "../../lib/shows";
import { isEmailValid } from "../../lib/email";
import { isNameTooLong } from "../../lib/name";
import { markAttended, restoreCheckin } from "../../lib/rsvp";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";
import PostHogClient from "../../../lib/posthog";
import {
  CHECKIN_COOKIE,
  isCheckinOpen,
  isShowToday,
  parseCheckinCookie,
  setCheckinCookie,
} from "../../lib/checkin-show";
import { isCheckinId } from "../shared/checkin-metadata";

export async function POST(request: NextRequest) {
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

    const { slug, email, name, phone, website, checkinId: claimId } = await request.json();

    // Honeypot: a hidden field only bots fill, so bail without touching the DB.
    if (website) {
      return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 400 });
    }

    if (!email?.trim() || !isEmailValid(email.trim())) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }
    if (isNameTooLong(name)) {
      return NextResponse.json({ error: "Name is too long" }, { status: 400 });
    }
    if (!slug?.trim()) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const show = await getShowBySlug(slug.trim());
    const claiming = isCheckinId(claimId);
    if (!show || !isCheckinOpen(show)) {
      return NextResponse.json({ error: "Check-in isn't open for this show." }, { status: 400 });
    }

    const showDay = isShowToday(show);
    const carryFromId = parseCheckinCookie(request.cookies.get(CHECKIN_COOKIE)?.value)?.checkinId ?? null;
    const attend = (claim: string | null) =>
      markAttended({ email, name, phone, slug: slug.trim(), claimId: claim, carryFromId });

    let result: Awaited<ReturnType<typeof markAttended>> | null = null;
    let restored = false;
    if (claiming) {
      try {
        result = await attend(claimId);
      } catch (error) {
        if (!(error instanceof Error && error.message.includes("unknown check-in"))) throw error;
      }
    }
    if (!result && showDay) {
      result = await attend(null);
    } else if (!result) {
      const restoreRate = checkRateLimit(getClientIP(request), "checkin-restore", {
        windowMs: 60 * 60 * 1000,
        maxRequests: 10,
      });
      if (!restoreRate.allowed) {
        return NextResponse.json(
          { error: "Too many tries. Try again later." },
          { status: 429, headers: { "Retry-After": String(Math.ceil(restoreRate.resetIn / 1000)) } },
        );
      }
      result = await restoreCheckin({ email, slug: slug.trim(), carryFromId });
      restored = true;
      if (!result) {
        return NextResponse.json(
          { error: "I don't have a check-in under that email for this show." },
          { status: 400 },
        );
      }
    }
    const { number, rsvpd, checkinId, steps } = result;

    if (!restored) {
      const posthog = PostHogClient();
      posthog.capture({
        distinctId: email.trim().toLowerCase(),
        event: "rsvp_attended",
        properties: { event_id: slug.trim(), rsvpd },
      });
      await posthog.shutdown();
    }

    const response = NextResponse.json({ success: true, ticketNo: number, rsvpd, checkinId, steps });
    if (checkinId) setCheckinCookie(response, slug.trim(), checkinId);
    return response;
  } catch (error) {
    console.error("[CHECKIN] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
