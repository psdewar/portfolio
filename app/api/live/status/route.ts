import { NextRequest, NextResponse } from "next/server";
import { getStreamStatus, isStreamPath } from "../../../lib/live";
import { publicCache } from "../../../lib/http";

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("path");
  const path = requested && isStreamPath(requested) ? requested : "live";
  return NextResponse.json(await getStreamStatus(path), {
    headers: { "Cache-Control": publicCache(3, 10) },
  });
}
