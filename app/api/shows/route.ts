import { NextRequest, NextResponse } from "next/server";
import { publishEventbrite } from "../../lib/eventbrite";
import { isShowDraft } from "../../lib/shows";

export const maxDuration = 30;

const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";
const SHOWS_TOKEN = process.env.SCHEDULE_API_TOKEN;

export async function GET() {
  try {
    const res = await fetch(`${SHOWS_API}/chorus/shows`, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text();
      console.error("[shows] GET failed:", res.status, text);
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[shows] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upstream unreachable" },
      { status: 502 },
    );
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
      return NextResponse.json(
        { error: responseText || "Failed to add show" },
        { status: res.status },
      );
    }

    let created: Record<string, unknown>;
    try {
      created = JSON.parse(responseText);
    } catch {
      created = body;
    }

    const show = { ...body, ...created };
    // Draft shows are pending sponsor confirmation — defer the public Eventbrite
    // event to the confirmation step so it never leaks before they say yes.
    const eventbrite = isShowDraft(show) ? undefined : await publishEventbrite(show);

    return NextResponse.json({ ...created, eventbrite });
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

export async function PATCH(request: NextRequest) {
  if (!SHOWS_TOKEN) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();

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
      return NextResponse.json(
        { error: responseText || "Failed to update show" },
        { status: res.status },
      );
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
