import { NextRequest, NextResponse } from "next/server";

const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";
const SHOWS_TOKEN = process.env.SCHEDULE_API_TOKEN;

export async function GET() {
  try {
    const res = await fetch(`${SHOWS_API}/chorus/pamphlets`, { cache: "no-store" });

    if (!res.ok) {
      console.error("[pamphlets] GET failed:", res.status, await res.text());
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[pamphlets] GET error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  if (!SHOWS_TOKEN) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();

    const res = await fetch(`${SHOWS_API}/chorus/pamphlets`, {
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
        { error: responseText || "Failed to add pamphlet" },
        { status: res.status },
      );
    }

    try {
      return NextResponse.json(JSON.parse(responseText));
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[pamphlets] POST error:", error);
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

    const res = await fetch(`${SHOWS_API}/chorus/pamphlets`, {
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
        { error: responseText || "Failed to update pamphlet" },
        { status: res.status },
      );
    }

    try {
      return NextResponse.json(JSON.parse(responseText));
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[pamphlets] PATCH error:", error);
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

    const res = await fetch(`${SHOWS_API}/chorus/pamphlets`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SHOWS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to delete pamphlet" }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[pamphlets] DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
