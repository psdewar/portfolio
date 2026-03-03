import { NextRequest, NextResponse } from "next/server";

const SPONSORS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";
const SHOWS_TOKEN = process.env.SCHEDULE_API_TOKEN;

export async function GET() {
  try {
    const res = await fetch(`${SPONSORS_API}/chorus/sponsors`, { cache: "no-store" });
    if (!res.ok) {
      console.error("[sponsors] GET failed:", res.status, await res.text());
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("[sponsors] GET error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  if (!SHOWS_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const res = await fetch(`${SPONSORS_API}/chorus/sponsors`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SHOWS_TOKEN}` },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok)
      return NextResponse.json({ error: text || "Failed to add sponsor" }, { status: res.status });

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[sponsors] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!SHOWS_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const res = await fetch(`${SPONSORS_API}/chorus/sponsors`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SHOWS_TOKEN}` },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok)
      return NextResponse.json(
        { error: text || "Failed to update sponsor" },
        { status: res.status },
      );

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[sponsors] PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!SHOWS_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const res = await fetch(`${SPONSORS_API}/chorus/sponsors`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SHOWS_TOKEN}` },
      body: JSON.stringify(body),
    });

    if (!res.ok)
      return NextResponse.json({ error: "Failed to delete sponsor" }, { status: res.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[sponsors] DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
