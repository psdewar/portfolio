import { NextRequest, NextResponse } from "next/server";

const SCHEDULE_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";
const SCHEDULE_TOKEN = process.env.SCHEDULE_API_TOKEN;

export async function GET() {
  try {
    const res = await fetch(`${SCHEDULE_API}/chorus/schedule`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[schedule] GET failed:", res.status, await res.text());
      return NextResponse.json({ nextStream: null }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[schedule] GET error:", error);
    return NextResponse.json({ nextStream: null }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  if (!SCHEDULE_TOKEN) {
    console.error("[schedule] SCHEDULE_API_TOKEN not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();

    const res = await fetch(`${SCHEDULE_API}/chorus/schedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SCHEDULE_TOKEN}`,
      },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: responseText || "Failed to update" },
        { status: res.status }
      );
    }

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[schedule] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
