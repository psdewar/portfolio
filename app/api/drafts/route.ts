import { NextRequest, NextResponse } from "next/server";
import { buildMagicLink } from "../../lib/draft-token";

const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";
const SHOWS_TOKEN = process.env.SCHEDULE_API_TOKEN;

export async function POST(request: NextRequest) {
  if (!SHOWS_TOKEN) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }
  if (!process.env.DRAFT_TOKEN_SECRET) {
    return NextResponse.json({ error: "DRAFT_TOKEN_SECRET not set" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const origin = request.nextUrl.origin;

    if (body.existingId) {
      const showsRes = await fetch(`${SHOWS_API}/chorus/shows`, { cache: "no-store" });
      const shows: Array<{ id?: string; slug?: string; visibility?: string }> = showsRes.ok
        ? await showsRes.json()
        : [];
      const show = shows.find((s) => s.id === body.existingId);
      if (!show || show.visibility !== "draft") {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }
      return NextResponse.json({
        id: show.id,
        slug: show.slug,
        magicLink: buildMagicLink(origin, show.id!),
      });
    }

    const { city, region, country, date, doorTime, venue, address } = body;

    if (!city || !region || !date) {
      return NextResponse.json(
        { error: "city, region, date required" },
        { status: 400 },
      );
    }

    const res = await fetch(`${SHOWS_API}/chorus/shows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SHOWS_TOKEN}`,
      },
      body: JSON.stringify({
        city,
        region,
        country: country || "",
        date,
        doorTime: doorTime || "7PM",
        venue: venue || null,
        address: address || null,
        visibility: "draft",
        planStatus: "intent",
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: text || "Failed to create draft" },
        { status: res.status },
      );
    }

    const created = await res.json();
    const slug: string | undefined = created.slug;

    const showsRes = await fetch(`${SHOWS_API}/chorus/shows`, { cache: "no-store" });
    const shows: Array<{ id?: string; slug?: string }> = showsRes.ok ? await showsRes.json() : [];
    const show = shows.find((s) => s.slug === slug);
    const id = show?.id;

    if (!id) {
      return NextResponse.json(
        { error: "Draft created but id not found", slug },
        { status: 500 },
      );
    }

    const magicLink = buildMagicLink(origin, id);

    return NextResponse.json({ id, slug, magicLink });
  } catch (error) {
    console.error("[drafts] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
