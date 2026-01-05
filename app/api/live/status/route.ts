import { NextResponse } from "next/server";

const OWNCAST_URL = process.env.NEXT_PUBLIC_OWNCAST_URL;

export async function GET() {
  if (!OWNCAST_URL) {
    return NextResponse.json(
      { error: "OWNCAST_URL not configured" },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(`${OWNCAST_URL}/api/status`, {
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { online: false, viewerCount: 0 },
        { status: 200 },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { online: false, viewerCount: 0 },
      { status: 200 },
    );
  }
}
