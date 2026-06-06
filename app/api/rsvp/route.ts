import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import { sendRsvpConfirmation } from "../../../lib/sendgrid";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";
import { getShows, isShowUpcoming } from "../../lib/shows";
import { isEmailValid } from "../../lib/email";
import { upsertRsvp } from "../../lib/rsvp";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const detail = searchParams.get("detail");

  const { data, error } = await supabaseAdmin
    .from("stay-connected")
    .select("name, email, rsvp")
    .not("rsvp", "is", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (detail === "emails") {
    const grouped: Record<string, { name: string; email: string; guests: number }[]> = {};
    for (const row of data || []) {
      for (const entry of row.rsvp || []) {
        const parts = entry.split(":");
        const slug = parts[0];
        const guests = parseInt(parts[1] || "1", 10);
        if (!grouped[slug]) grouped[slug] = [];
        grouped[slug].push({ name: row.name || "", email: row.email, guests });
      }
    }
    return NextResponse.json(grouped);
  }

  const counts: Record<string, { responses: number; attending: number }> = {};
  for (const row of data || []) {
    for (const entry of row.rsvp || []) {
      const parts = entry.split(":");
      const slug = parts[0];
      const guests = parseInt(parts[1] || "1", 10);
      if (!counts[slug]) counts[slug] = { responses: 0, attending: 0 };
      counts[slug].responses += 1;
      counts[slug].attending += guests;
    }
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
    const { name, email, guests, eventId } = body;

    console.log("[RSVP API] Received:", { name, email, guests, eventId });

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
      await upsertRsvp({ email, name, slug: eventId, guests: guestCount });
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
      .from("stay-connected")
      .select("id, rsvp")
      .not("rsvp", "is", null);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const prefix = `${slug}:`;
    let affected = 0;
    for (const row of data || []) {
      const original: string[] = row.rsvp || [];
      const filtered = original.filter((e) => !e.startsWith(prefix));
      if (filtered.length === original.length) continue;
      const { error: updateError } = await supabaseAdmin
        .from("stay-connected")
        .update({ rsvp: filtered.length > 0 ? filtered : null })
        .eq("id", row.id);
      if (updateError) {
        console.error("[RSVP DELETE] Update error for row", row.id, updateError);
        continue;
      }
      affected += 1;
    }

    return NextResponse.json({ ok: true, affected });
  } catch (error) {
    console.error("[RSVP DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
