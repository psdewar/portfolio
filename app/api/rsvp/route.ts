import { NextResponse, after } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { sendRsvpConfirmation } from "../../../lib/sendgrid";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";
import { getDoorLabel, getShows, isShowUpcoming, publicVenueName } from "../../lib/shows";
import { buildIcs } from "../../lib/ics";
import { isEmailValid } from "../../lib/email";
import { upsertRsvp, getRsvpCounts } from "../../lib/rsvp";
import { upsertIdentity } from "../../lib/identity";
import { sendMetaLead } from "../../lib/meta-capi";
import { sanitizeUtm } from "../../lib/utm";
import { isAdminAuthorized } from "../shared/admin-auth";

export async function GET(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getRsvpCounts());
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = checkRateLimit(ip, "rsvp");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const { name, email, phone, guests, eventId } = body;
    const isMaybe = body.intent === "maybe";

    console.log("[RSVP API] Received:", { name, email, phone, guests, eventId });

    if (!email?.trim() || !isEmailValid(email.trim())) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    if (!eventId?.trim()) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    const shows = await getShows();
    const show = shows.find((s) => s.slug === eventId.trim());
    if (!show || !isShowUpcoming(show)) {
      return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    }

    if (isMaybe && !name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const guestCount = Math.max(1, Math.min(10, parseInt(guests, 10) || 1));
    try {
      if (isMaybe) {
        await upsertIdentity({ email, name, phone, source: `rsvp-maybe:${eventId.trim()}` });
      } else {
        await upsertRsvp({ email, name, phone, slug: eventId, guests: guestCount, utm: sanitizeUtm(body.utm) });
      }
    } catch (saveError) {
      console.error("[RSVP] Save error:", saveError);
      return NextResponse.json(
        { error: "Failed to save RSVP. Please try again." },
        { status: 500 },
      );
    }

    const userAgent = request.headers.get("user-agent");
    after(() =>
      sendMetaLead({
        email,
        slug: eventId.trim(),
        ip,
        userAgent,
        fbclid: body.fbclid,
      }),
    );

    const dateLabel = new Date(show.date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const shortDate = new Date(show.date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

    // The confirmation email is where a hidden host is revealed.
    const venueName = publicVenueName({ ...show, hideHost: false });
    const addressHasCity = show.address?.toLowerCase().includes(show.city.toLowerCase());
    const address = show.address
      ? addressHasCity
        ? show.address
        : `${show.address}, ${show.city}, ${show.region}`
      : undefined;
    const ics = buildIcs({
      uid: `${show.slug}@peytspencer.com`,
      title: `${show.eventName || show.name}, ${show.city}`,
      date: show.date,
      doorTime: show.doorTime,
      location:
        [venueName, address].filter(Boolean).join(", ") || `${show.city}, ${show.region}`,
      url: `https://peytspencer.com/rsvp/${show.slug}`,
    });

    try {
      await sendRsvpConfirmation({
        to: email.trim(),
        title: show.eventName || `${show.name}: My Path of Growth and the Principles that Connect Us`,
        dateLabel,
        shortDate,
        city: show.city,
        region: show.region,
        doorLabel: getDoorLabel(show),
        venueName: venueName || undefined,
        address,
        ics: { filename: `${show.slug}.ics`, content: ics },
        maybe: isMaybe,
      });
      console.log("[RSVP API] Confirmation email sent to", email.trim());
    } catch (emailError) {
      console.error("[RSVP API] Confirmation email failed for", email.trim(), emailError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RSVP] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { slug } = await request.json();
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "slug required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("rsvps")
      .delete()
      .eq("show_slug", slug)
      .select("id");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, affected: (data || []).length });
  } catch (error) {
    console.error("[RSVP DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
