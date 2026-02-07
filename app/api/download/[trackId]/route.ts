import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../shared/stripe-utils";
import {
  isValidAsset,
  getProduct,
  getDownloadableAssets,
  getFileFormat,
} from "../../shared/products";
import {
  checkRateLimit,
  getClientIP,
  createRateLimitHeaders,
  RATE_LIMIT_CONFIGS,
} from "../../shared/rate-limit";
import {
  sanitizeTrackId,
  validateOrigin,
  fetchAudioBlob,
  fetchAudioBuffer,
  generateMockAudioBuffer,
  formatTrackFilename,
  createDownloadHeaders,
  logDevError,
} from "../../shared/audio-utils";

const MAX_DOWNLOADS_PER_TRACK = 5;
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest, { params }: { params: Promise<{ trackId: string }> }) {
  try {
    const { trackId: rawTrackId } = await params;
    const ip = getClientIP(request);

    const rateCheck = checkRateLimit(ip, "download");
    if (!rateCheck.allowed) {
      return new NextResponse("Too many download requests. Try again later.", {
        status: 429,
        headers: {
          ...createRateLimitHeaders(
            rateCheck.remaining,
            rateCheck.resetIn,
            RATE_LIMIT_CONFIGS.download.maxRequests
          ),
          "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)),
        },
      });
    }

    if (!validateOrigin(request)) {
      return new NextResponse("Unauthorized origin", { status: 403 });
    }

    const trackId = sanitizeTrackId(rawTrackId);
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return new NextResponse("Payment verification required", { status: 401 });
    }

    if (!isValidAsset(trackId)) {
      return new NextResponse("Track not found", { status: 404 });
    }

    // Dev bypass for test sessions
    if (process.env.NODE_ENV === "development" && sessionId.startsWith("test_")) {
      const fileFormat = trackId.includes("bundle") || trackId.includes("singles") ? "zip" : "mp3";
      let audioBuffer: ArrayBuffer;
      try {
        const audioBlob = await fetchAudioBlob(trackId, fileFormat);
        audioBuffer = audioBlob ? await fetchAudioBuffer(audioBlob.url) : generateMockAudioBuffer();
      } catch {
        audioBuffer = generateMockAudioBuffer();
      }
      const filename = formatTrackFilename(trackId, fileFormat);
      const headers = createDownloadHeaders(audioBuffer, filename, fileFormat);
      return new NextResponse(audioBuffer, {
        headers: {
          ...headers,
          ...createRateLimitHeaders(
            rateCheck.remaining - 1,
            rateCheck.resetIn,
            RATE_LIMIT_CONFIGS.download.maxRequests
          ),
        },
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return new NextResponse("Payment not completed", { status: 402 });
    }

    const paymentTime = session.created * 1000;
    if (Date.now() > paymentTime + SESSION_EXPIRY_MS) {
      return new NextResponse("Download link expired", { status: 410 });
    }

    const hasAccess = await verifyTrackAccess(session, trackId);
    if (!hasAccess) {
      return new NextResponse("Track not included in purchase", { status: 403 });
    }

    // Get file format from product config
    const productId = session.metadata?.productId;
    const product = productId ? getProduct(productId) : null;
    const fileFormat = product ? getFileFormat(product) : "mp3";

    const downloadKey = `downloads_${trackId}`;
    const currentDownloads = parseInt(session.metadata?.[downloadKey] || "0", 10);

    if (currentDownloads >= MAX_DOWNLOADS_PER_TRACK) {
      return new NextResponse("Download limit reached for this track. Contact support if needed.", {
        status: 403,
      });
    }

    const audioBlob = await fetchAudioBlob(trackId, fileFormat);
    if (!audioBlob) {
      return new NextResponse("Track file not found", { status: 404 });
    }

    const audioBuffer = await fetchAudioBuffer(audioBlob.url);

    await stripe.checkout.sessions.update(sessionId, {
      metadata: {
        ...session.metadata,
        [downloadKey]: (currentDownloads + 1).toString(),
      },
    });

    const filename = formatTrackFilename(trackId, fileFormat);
    const headers = createDownloadHeaders(audioBuffer, filename, fileFormat);

    return new NextResponse(audioBuffer, {
      headers: {
        ...headers,
        ...createRateLimitHeaders(
          rateCheck.remaining - 1,
          rateCheck.resetIn,
          RATE_LIMIT_CONFIGS.download.maxRequests
        ),
      },
    });
  } catch (error) {
    logDevError(error, "Download error");
    return new NextResponse("Internal server error", { status: 500 });
  }
}

async function verifyTrackAccess(
  session: { metadata?: Record<string, string> | null },
  trackId: string
): Promise<boolean> {
  const metadata = session.metadata;
  if (!metadata) return false;

  const productId = metadata.productId;
  if (productId) {
    const product = getProduct(productId);
    if (product) {
      const assets = getDownloadableAssets(product);
      return assets.includes(trackId);
    }
  }

  // Fallback: check downloadableAssets stored in metadata
  const assetsStr = metadata.downloadableAssets;
  if (assetsStr) {
    const assets = assetsStr.split(",");
    return assets.includes(trackId);
  }

  // Legacy fallback: check trackId directly
  if (metadata.trackId === trackId) {
    return true;
  }

  return false;
}
