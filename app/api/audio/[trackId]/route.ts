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
} from "../../shared/audio-utils";

export async function GET(request: NextRequest, { params }: { params: { trackId: string } }) {
  try {
    const ip = extractIpAddress(request);

    if (!checkStreamRateLimit(ip)) {
      return new NextResponse("Too many streaming requests", { status: 429 });
    }

    if (!validateOrigin(request)) {
      const origin = request.headers.get("origin") || request.headers.get("referer");
      logDevWarning(`Potential hotlinking attempt from: ${origin}, IP: ${ip}`);
      // For now, allow but could be blocked in production
    }

    const trackId = sanitizeTrackId(params.trackId);
    if (!validateTrackId(trackId)) {
      return new NextResponse("Track not found", { status: 404 });
    }

    const audioBlob = await fetchAudioBlob(trackId);
    if (!audioBlob) {
      return new NextResponse("Track not found", { status: 404 });
    }

    const audioBuffer = await fetchAudioBuffer(audioBlob.url);

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
