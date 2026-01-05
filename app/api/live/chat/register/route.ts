import { NextRequest, NextResponse } from "next/server";

const OWNCAST_URL = process.env.NEXT_PUBLIC_OWNCAST_URL;

export async function POST(request: NextRequest) {
  if (!OWNCAST_URL) {
    return NextResponse.json(
      { error: "OWNCAST_URL not configured" },
      { status: 500 },
    );
  }

  try {
    const body = await request.json();

    const res = await fetch(`${OWNCAST_URL}/api/chat/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to register" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
