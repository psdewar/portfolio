import { NextRequest, NextResponse } from "next/server";

const OWNCAST_URL = process.env.NEXT_PUBLIC_OWNCAST_URL;
const OWNCAST_ADMIN_TOKEN = process.env.OWNCAST_ADMIN_TOKEN;

// GET chat history
export async function GET() {
  if (!OWNCAST_URL) {
    return NextResponse.json(
      { error: "OWNCAST_URL not configured" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${OWNCAST_URL}/api/chat/messages`, {
      headers: OWNCAST_ADMIN_TOKEN
        ? { Authorization: `Bearer ${OWNCAST_ADMIN_TOKEN}` }
        : {},
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      // 404 is normal when Owncast has no chat history or server is offline
      if (res.status !== 404) {
        console.error("[Chat API] Failed to fetch history:", res.status);
      }
      return NextResponse.json([], { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[Chat API] Error fetching history:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST send message
export async function POST(request: NextRequest) {
  if (!OWNCAST_URL) {
    return NextResponse.json(
      { error: "OWNCAST_URL not configured" },
      { status: 500 },
    );
  }

  try {
    const authHeader = request.headers.get("authorization");
    const body = await request.json();

    const res = await fetch(`${OWNCAST_URL}/api/integrations/chat/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to send" },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 },
    );
  }
}
