import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import {
  ensureLiveStream,
  exchangeCode,
  fetchChannelTitle,
  forgetAccessToken,
  OAUTH_COOKIE,
  STREAM_TITLES,
  YOUTUBE_ACCOUNTS,
  youtubeRedirectUri,
} from "../../../../lib/youtube";

async function connect(request: NextRequest, redirectUri: string): Promise<string> {
  const params = request.nextUrl.searchParams;
  const error = params.get("error");
  if (error) throw new Error(`Google: ${error}`);
  const state = params.get("state");
  if (!state || state !== request.cookies.get(OAUTH_COOKIE)?.value) {
    throw new Error("Invalid OAuth state");
  }
  const code = params.get("code");
  if (!code) throw new Error("Missing authorization code");

  const { refreshToken, accessToken: token } = await exchangeCode(code, redirectUri);
  forgetAccessToken(refreshToken);
  const channelTitle = await fetchChannelTitle(token);
  const { error: dbError } = await supabaseAdmin.from("youtube_accounts").upsert(
    YOUTUBE_ACCOUNTS.map((a) => ({
      account: a,
      refresh_token: refreshToken,
      channel_title: channelTitle,
      updated_at: new Date().toISOString(),
    })),
  );
  if (dbError) throw dbError;
  for (const a of YOUTUBE_ACCOUNTS) {
    const stream = await ensureLiveStream(token, STREAM_TITLES[a]);
    const { error: streamError } = await supabaseAdmin
      .from("youtube_accounts")
      .update({
        live_stream_id: stream.id,
        ingest_url: stream.ingestUrl,
        stream_name: stream.streamName,
        updated_at: new Date().toISOString(),
      })
      .eq("account", a);
    if (streamError) throw streamError;
  }
  return "main";
}

export async function GET(request: NextRequest) {
  const redirectUri = youtubeRedirectUri(request);
  const back = new URL("/admin/livestream", redirectUri);
  try {
    back.searchParams.set("connected", await connect(request, redirectUri));
  } catch (error) {
    console.error("[youtube] connect failed:", error);
    back.searchParams.set("youtube_error", error instanceof Error ? error.message : String(error));
  }
  const response = NextResponse.redirect(back);
  response.cookies.set(OAUTH_COOKIE, "", { path: "/api/admin/youtube", maxAge: 0 });
  return response;
}
