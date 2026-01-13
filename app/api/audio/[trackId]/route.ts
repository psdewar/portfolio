import { NextRequest, NextResponse } from "next/server";
import {
  checkStreamRateLimit,
  sanitizeTrackId,
  extractIpAddress,
  validateOrigin,
  validateTrackId,
  fetchAudioBlob,
  fetchAudioBuffer,
  generateETag,
  checkConditionalHeaders,
  createBaseHeaders,
  parseRangeHeader,
  createRangeHeaders,
  logDevError,
  logDevWarning,
  generateMockAudioBuffer,
} from "../../shared/audio-utils";

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

    let audioBuffer: ArrayBuffer;

    // Use local mock audio in dev mode to avoid Vercel Blob egress costs
    if (useLocalAudio) {
      audioBuffer = generateMockAudioBuffer();
    } else {
      const audioBlob = await fetchAudioBlob(trackId);
      if (!audioBlob) {
        return new NextResponse("Track not found", { status: 404 });
      }
      audioBuffer = await fetchAudioBuffer(audioBlob.url);
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
