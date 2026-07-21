import { NextRequest, NextResponse } from "next/server";
import { publishEventbrite } from "../../lib/eventbrite";
import { getShowBySlug, type Show } from "../../lib/shows";
import { verifySlug } from "../../lib/confirm";
import { isEmailValid } from "../../lib/email";
import { isAdminAuthorized } from "../shared/admin-auth";

export const maxDuration = 30;

const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";
const SHOWS_TOKEN = process.env.SCHEDULE_API_TOKEN;

const authJson = { "Content-Type": "application/json", Authorization: `Bearer ${SHOWS_TOKEN}` };

interface Sponsor {
  showSlug?: string;
  submittedAt?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

// Write the sponsor's contact onto the show's host record: PATCH the existing
// host (matched by showSlug + submittedAt) if it exists, else POST a fresh one.
async function upsertHost(
  slug: string,
  contact: { name: string; email: string; phone: string },
  show: { city: string; region: string; country?: string | null; date: string; doorTime: string },
) {
  let host: Sponsor | undefined;
  try {
    const res = await fetch(`${SHOWS_API}/chorus/sponsors`, { cache: "no-store" });
    if (res.ok) {
      const sponsors: Sponsor[] = await res.json();
      host = sponsors.find((s) => s.showSlug === slug && s.role === "host");
    }
  } catch {
    // fall through to POST
  }

  if (host?.submittedAt) {
    await fetch(`${SHOWS_API}/chorus/sponsors`, {
      method: "PATCH",
      headers: authJson,
      body: JSON.stringify({
        showSlug: slug,
        submittedAt: host.submittedAt,
        ...contact,
        date: show.date,
        doorTime: show.doorTime,
      }),
    });
    return;
  }

  await fetch(`${SHOWS_API}/chorus/sponsors`, {
    method: "POST",
    headers: authJson,
    body: JSON.stringify({
      showSlug: slug,
      role: "host",
      ...contact,
      city: show.city,
      region: show.region,
      country: show.country || "US",
      date: show.date,
      doorTime: show.doorTime,
      items: [],
    }),
  });
}

export async function POST(request: NextRequest) {
  if (!SHOWS_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const { slug, sig, name, email, phone, date, doorTime, venue, address, city, region, country } =
      await request.json();
    // The host confirms via a signed link; the artist can confirm their own drafts
    // straight from the admin (cookie auth), so no signature roundtrip is needed there.
    const authorized = slug && ((await isAdminAuthorized(request)) || verifySlug(slug, sig));
    if (!authorized) {
      return NextResponse.json({ error: "Invalid or expired link" }, { status: 403 });
    }
    if (!name?.trim() || !isEmailValid(email || "")) {
      return NextResponse.json({ error: "Add your name and a valid email." }, { status: 400 });
    }

    const show = await getShowBySlug(slug);
    if (!show) return NextResponse.json({ error: "Show not found" }, { status: 404 });

    // Date/time can change at confirmation ("in case we change our minds"); fall
    // back to the draft's values when the form omits them.
    const nextDate = typeof date === "string" && date.trim() ? date.trim() : show.date;
    const nextDoorTime =
      typeof doorTime === "string" && doorTime.trim() ? doorTime.trim() : show.doorTime;
    const contact = { name: name.trim(), email: email.trim(), phone: (phone || "").trim() };

    // Press-kit invite: the admin's location-less draft (opaque "draft-N" slug) is
    // a reusable template. Each host supplies their own location, so spawn a fresh
    // location-derived show (chorus mints the clean city-region slug) and leave the
    // draft in place — the same signed link keeps working for the next host.
    if (!show.city?.trim() || !show.region?.trim()) {
      const loc = { city: (city || "").trim(), region: (region || "").trim() };
      if (!loc.city || !loc.region) {
        return NextResponse.json({ error: "Add the city and state." }, { status: 400 });
      }

      const spawned: Show = {
        ...show,
        ...loc,
        country: (country || show.country || "US").trim(),
        venue: (venue || "").trim() || null,
        address: (address || "").trim() || null,
        date: nextDate,
        doorTime: nextDoorTime,
        stage: "booked",
        visibility: show.visibility === "draft" ? "public" : show.visibility || "public",
        eventbriteId: null,
      };

      // chorus mints a fresh slug + id, so the draft's must not ride along —
      // a duplicate "slug" key would shadow the minted one on read-back.
      const createBody: Record<string, unknown> = { ...spawned };
      delete createBody.slug;
      delete createBody.id;

      const created = await fetch(`${SHOWS_API}/chorus/shows`, {
        method: "POST",
        headers: authJson,
        body: JSON.stringify(createBody),
      });
      if (!created.ok) {
        return NextResponse.json(
          { error: (await created.text()) || "Failed to book" },
          { status: created.status },
        );
      }
      const newSlug = ((await created.json()) as { slug: string }).slug;

      const bookedShow: Show = { ...spawned, slug: newSlug };
      await upsertHost(newSlug, contact, bookedShow);

      const eventbrite =
        spawned.visibility === "private" ? undefined : await publishEventbrite(bookedShow);

      return NextResponse.json({ ok: true, slug: newSlug, eventbrite });
    }

    const booked = { ...show, date: nextDate, doorTime: nextDoorTime };

    await upsertHost(slug, contact, booked);

    // Publish: advance the lifecycle to booked. Keep access (private stays private);
    // a legacy "draft" visibility becomes public.
    const visibility = show.visibility === "draft" ? "public" : show.visibility;
    const patch = await fetch(`${SHOWS_API}/chorus/shows`, {
      method: "PATCH",
      headers: authJson,
      body: JSON.stringify({ slug, stage: "booked", visibility, date: nextDate, doorTime: nextDoorTime }),
    });
    if (!patch.ok) {
      return NextResponse.json(
        { error: (await patch.text()) || "Failed to publish" },
        { status: patch.status },
      );
    }

    // Eventbrite was deferred at creation — create it now, unless this is invite-only.
    const eventbrite =
      visibility === "private"
        ? undefined
        : await publishEventbrite({ ...booked, stage: "booked", visibility });

    return NextResponse.json({ ok: true, slug, eventbrite });
  } catch (error) {
    console.error("[confirm] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
