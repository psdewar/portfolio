import { NextRequest, NextResponse } from "next/server";
import {
  checkStreamRateLimit,
  sanitizeTrackId,
  extractIpAddress,
  validateOrigin,
  validateTrackId,
  generateETag,
  checkConditionalHeaders,
  createBaseHeaders,
  parseRangeHeader,
  createRangeHeaders,
  logDevError,
  logDevWarning,
  generateMockAudioBuffer,
} from "../../shared/audio-utils";
import { isPatronTrack } from "../../../data/patron-config";

// VPS URL for audio files
const VPS_AUDIO_BASE_URL = process.env.VPS_AUDIO_URL || "https://assets.peytspencer.com/audio";
const CF_ACCESS_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID || "";
const CF_ACCESS_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET || "";

// Helper to simulate network delay in development
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function GET(request: NextRequest, { params }: { params: Promise<{ trackId: string }> }) {
  try {
    const { trackId: rawTrackId } = await params;
    const ip = extractIpAddress(request);
    const isDev = process.env.NODE_ENV === "development";

    // Dev tools: check for local audio and delay flags
    const useLocalAudio = isDev && request.nextUrl.searchParams.get("local") === "1";
    const delayMs = isDev ? Number(request.nextUrl.searchParams.get("delay")) || 0 : 0;

    // Simulate slow network in dev
    if (delayMs > 0) {
      await sleep(delayMs);
    }

    if (!checkStreamRateLimit(ip)) {
      return new NextResponse("Too many streaming requests", { status: 429 });
    }

    if (!validateOrigin(request)) {
      const origin = request.headers.get("origin") || request.headers.get("referer");
      logDevWarning(`Potential hotlinking attempt from: ${origin}, IP: ${ip}`);
      // For now, allow but could be blocked in production
    }

    const trackId = sanitizeTrackId(rawTrackId);
    if (!validateTrackId(trackId)) {
      return new NextResponse("Track not found", { status: 404 });
    }

    // Check patron access for patron-exclusive tracks
    if (isPatronTrack(trackId)) {
      const patronToken = request.cookies.get("patronToken")?.value;
      if (patronToken !== "active") {
        return new NextResponse("Patron access required", { status: 403 });
      }
    }

    let audioBuffer: ArrayBuffer;

    // Use local mock audio in dev mode
    if (useLocalAudio) {
      audioBuffer = generateMockAudioBuffer();
    } else {
      // All tracks: fetch from VPS via Cloudflare Access
      const vpsUrl = `${VPS_AUDIO_BASE_URL}/${trackId}.mp3`;
      const vpsHeaders: HeadersInit = {};
      if (CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET) {
        vpsHeaders["CF-Access-Client-Id"] = CF_ACCESS_CLIENT_ID;
        vpsHeaders["CF-Access-Client-Secret"] = CF_ACCESS_CLIENT_SECRET;
      }
      const response = await fetch(vpsUrl, { headers: vpsHeaders });
      if (!response.ok) {
        console.error(`VPS fetch failed: ${response.status} for ${vpsUrl}`);
        return new NextResponse("Track not found", { status: 404 });
      }
      audioBuffer = await response.arrayBuffer();
    }

    // For caching
    const etag = generateETag(audioBuffer);
    const lastModified = new Date().toUTCString();

    if (checkConditionalHeaders(request, etag, lastModified)) {
      return new NextResponse(null, { status: 304 });
    }

    // Set proper headers for private browser caching with range support
    const baseHeaders = createBaseHeaders(audioBuffer, etag, lastModified);
    const headers = new Headers({
      ...baseHeaders,
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, max-age=86400, stale-while-revalidate=86400", // 24h private cache
    });

    // Handle range requests for audio seeking
    const range = request.headers.get("range");
    if (range) {
      const rangeData = parseRangeHeader(range, audioBuffer.byteLength);

      if (!rangeData) {
        return new NextResponse("Invalid range", { status: 416 });
      }

      const { start, end } = rangeData;
      const rangeHeaders = createRangeHeaders(start, end, audioBuffer.byteLength);

      Object.entries(rangeHeaders).forEach(([key, value]) => {
        headers.set(key, value);
      });

      return new NextResponse(audioBuffer.slice(start, end + 1), {
        status: 206, // Partial Content
        headers,
      });
    }

    return new NextResponse(audioBuffer, { headers });
  } catch (error) {
    logDevError(error, "Error fetching audio");
    return new NextResponse("Internal server error", { status: 500 });
  }
}
