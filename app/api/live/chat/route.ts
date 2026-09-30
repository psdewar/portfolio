import { NextRequest, NextResponse } from "next/server";
import { isStreamPath } from "../../../lib/live";
import { logRelayError, syncYouTubeChat } from "../../../lib/livestream";
import { isRelayAuthorized } from "../../../lib/relay-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function GET(request: NextRequest) {
  if (!isRelayAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const path = request.nextUrl.searchParams.get("path");
  if (!path || !isStreamPath(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  try {
    return NextResponse.json({ inserted: await syncYouTubeChat(path) });
  } catch (e) {
    logRelayError(`youtube chat ${path}`, e);
    return NextResponse.json({ error: "Chat sync failed" }, { status: 500 });
  }
}
