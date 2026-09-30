import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  OAUTH_COOKIE,
  youtubeAuthUrl,
  youtubeRedirectUri,
} from "../../../../lib/youtube";

export function GET(request: NextRequest) {
  const state = randomUUID();
  const redirectUri = youtubeRedirectUri(request);
  let authUrl: string;
  try {
    authUrl = youtubeAuthUrl(state, redirectUri);
  } catch (error) {
    console.error("[youtube] connect failed:", error);
    const back = new URL("/admin/livestream", redirectUri);
    back.searchParams.set("youtube_error", error instanceof Error ? error.message : String(error));
    return NextResponse.redirect(back);
  }
  const response = NextResponse.redirect(authUrl);
  response.cookies.set(OAUTH_COOKIE, state, {
    httpOnly: true,
    secure: redirectUri.startsWith("https"),
    sameSite: "lax",
    path: "/api/admin/youtube",
    maxAge: 600,
  });
  return response;
}
