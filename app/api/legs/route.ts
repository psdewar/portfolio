import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";
const API_TOKEN = process.env.SCHEDULE_API_TOKEN;

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/chorus/legs`, { cache: "no-store" });
    if (!res.ok) {
      console.error("[legs] GET failed:", res.status, await res.text());
      return NextResponse.json([], { status: 200 });
    }
    return NextResponse.json(await res.json());
  } catch (error) {
    console.error("[legs] GET error:", error);
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  if (!API_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const res = await fetch(`${API_BASE}/chorus/legs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_TOKEN}` },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok)
      return NextResponse.json({ error: text || "Failed to add leg" }, { status: res.status });

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[legs] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!API_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const res = await fetch(`${API_BASE}/chorus/legs`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_TOKEN}` },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok)
      return NextResponse.json({ error: text || "Failed to update leg" }, { status: res.status });

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[legs] PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!API_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const res = await fetch(`${API_BASE}/chorus/legs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_TOKEN}` },
      body: JSON.stringify(body),
    });

    if (!res.ok)
      return NextResponse.json({ error: "Failed to delete leg" }, { status: res.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[legs] DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
