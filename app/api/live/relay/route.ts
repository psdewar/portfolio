import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isStreamPath } from "../../../lib/live";
import { relayLines } from "../../../lib/livestream";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function isAuthorized(header: string | null): boolean {
  const token = process.env.LIVE_RELAY_TOKEN;
  if (!token) throw new Error("LIVE_RELAY_TOKEN is not set");
  const provided = Buffer.from(header?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(token);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const path = request.nextUrl.searchParams.get("path");
  if (!path || !isStreamPath(path)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  const lines = await relayLines(path);
  return new Response(lines.length ? `${lines.join("\n")}\n` : "", {
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}
