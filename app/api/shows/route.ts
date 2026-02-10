import { NextRequest, NextResponse } from "next/server";

const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";
const SHOWS_TOKEN = process.env.SCHEDULE_API_TOKEN;

export async function GET() {
  try {
    const res = await fetch(`${SHOWS_API}/chorus/shows`, { cache: "no-store" });

    if (!res.ok) {
      console.error("[shows] GET failed:", res.status, await res.text());
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[shows] GET error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  if (!SHOWS_TOKEN) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();

    const res = await fetch(`${SHOWS_API}/chorus/shows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SHOWS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();

    if (!res.ok) {
      return NextResponse.json({ error: responseText || "Failed to add show" }, { status: res.status });
    }

    try {
      return NextResponse.json(JSON.parse(responseText));
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[shows] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!SHOWS_TOKEN) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();

    const res = await fetch(`${SHOWS_API}/chorus/shows`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SHOWS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to delete show" }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[shows] DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

function toSlug(city: string, region: string): string {
  return `${city}-${region}`.toLowerCase().replace(/\s+/g, "-");
}

export async function PATCH(request: NextRequest) {
  if (!SHOWS_TOKEN) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();

    if (body.city || body.region) {
      const shows = await fetch(`${SHOWS_API}/chorus/shows`, { cache: "no-store" }).then((r) => r.json()).catch(() => []);
      const current = shows.find((s: { slug: string }) => s.slug === body.slug);
      if (current) {
        body.slug = toSlug(body.city || current.city, body.region || current.region);
      }
    }

    const res = await fetch(`${SHOWS_API}/chorus/shows`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SHOWS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();

    if (!res.ok) {
      return NextResponse.json({ error: responseText || "Failed to update show" }, { status: res.status });
    }

    try {
      return NextResponse.json(JSON.parse(responseText));
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[shows] PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
