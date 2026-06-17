import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { sendRsvpConfirmation } from "../../../lib/sendgrid";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";
import { getShows, isShowUpcoming } from "../../lib/shows";
import { isEmailValid } from "../../lib/email";
import { upsertRsvp, namesByEmail } from "../../lib/rsvp";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detail = searchParams.get("detail");

  const { data, error } = await supabaseAdmin
    .from("rsvps")
    .select("show_slug, email, guests");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (detail === "emails") {
    const names = await namesByEmail([...new Set((data || []).map((r) => r.email))]);
    const grouped: Record<string, { name: string; email: string; guests: number }[]> = {};
    for (const row of data || []) {
      if (!grouped[row.show_slug]) grouped[row.show_slug] = [];
      grouped[row.show_slug].push({
        name: names.get(row.email) || "",
        email: row.email,
        guests: row.guests ?? 1,
      });
    }
    return NextResponse.json(grouped);
  }

  const counts: Record<string, { responses: number; attending: number }> = {};
  for (const row of data || []) {
    if (!counts[row.show_slug]) counts[row.show_slug] = { responses: 0, attending: 0 };
    counts[row.show_slug].responses += 1;
    counts[row.show_slug].attending += row.guests ?? 1;
  }
  return NextResponse.json(counts);
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

    const guestCount = Math.max(1, Math.min(10, parseInt(guests, 10) || 1));
    try {
      await upsertRsvp({ email, name, phone, slug: eventId, guests: guestCount });
    } catch (saveError) {
      console.error("[RSVP] Save error:", saveError);
      return NextResponse.json(
        { error: "Failed to save RSVP. Please try again." },
        { status: 500 },
      );
    }

    const eventDate = new Date(show.date + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    try {
      await sendRsvpConfirmation({
        to: email.trim(),
        name: name?.trim() || "",
        guests: guestCount,
        eventName: show.name,
        eventDate,
        eventTime: `Doors open at ${show.doorTime}`,
        eventLocation: show.venue || show.address || `${show.city}, ${show.region}`,
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
