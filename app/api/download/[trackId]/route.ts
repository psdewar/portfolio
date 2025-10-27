import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "../../shared/stripe-utils";
import {
  sanitizeTrackId,
  validateOrigin,
  validateTrackId,
  fetchAudioBlob,
  fetchAudioBuffer,
  verifyStripeSession,
  formatTrackFilename,
  createDownloadHeaders,
  logDevError,
} from "../../shared/audio-utils";

export async function GET(request: NextRequest, { params }: { params: { trackId: string } }) {
  try {
    // Rate limiting
    // const ip = extractIpAddress(request);

    // if (!checkDownloadRateLimit(ip)) {
    //   return new NextResponse("Too many download requests", { status: 429 });
    // }

    // Verify origin
    if (!validateOrigin(request)) {
      return new NextResponse("Unauthorized origin", { status: 403 });
    }

    const trackId = sanitizeTrackId(params.trackId);
    const { searchParams } = new URL(request.url);

    // Enhanced session verification
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return new NextResponse("Payment verification required", { status: 401 });
    }

    // Verify payment session with Stripe
    const sessionResult = await verifyStripeSession(stripe, sessionId, trackId);
    if (!sessionResult.success) {
      return new NextResponse(sessionResult.error, { status: sessionResult.status });
    }

    // Validate track ID against whitelist
    if (!validateTrackId(trackId)) {
      return new NextResponse("Track not found", { status: 404 });
    }

    const audioBlob = await fetchAudioBlob(trackId);
    if (!audioBlob) {
      return new NextResponse("Track not found", { status: 404 });
    }

    // Fetch the audio file from blob storage
    const audioBuffer = await fetchAudioBuffer(audioBlob.url);

    // Format track title for filename
    const filename = formatTrackFilename(trackId);
    const headers = createDownloadHeaders(audioBuffer, filename);

    return new NextResponse(audioBuffer, { headers });
  } catch (error) {
    logDevError(error, "Error downloading audio");
    return new NextResponse("Internal server error", { status: 500 });
  }
}
