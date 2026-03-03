import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../../shared/stripe-utils";
import {
  isValidAsset,
  getProduct,
  getDownloadableAssets,
  getFileFormat,
} from "../../shared/products";
import { getPurchaseBySessionId } from "../../../../lib/supabase-admin";
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

    // Retrieve payment record — PaymentIntent for in-person, Checkout Session for online
    let paymentMetadata: Record<string, string>;

    if (sessionId.startsWith("pi_")) {
      const pi = await stripe.paymentIntents.retrieve(sessionId);
      if (pi.status !== "succeeded") {
        return new NextResponse("Payment not completed", { status: 402 });
      }
      paymentMetadata = pi.metadata || {};
    } else {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== "paid") {
        return new NextResponse("Payment not completed", { status: 402 });
      }
      paymentMetadata = session.metadata || {};
    }

    // Check expiry from Supabase purchase record (30-day window)
    const purchase = await getPurchaseBySessionId(sessionId);
    if (purchase) {
      const expiresAt = new Date(purchase.expires_at);
      if (Date.now() > expiresAt.getTime()) {
        return new NextResponse("Download link expired", { status: 410 });
      }
    }

    const hasAccess = await verifyTrackAccess({ metadata: paymentMetadata }, trackId);
    if (!hasAccess) {
      return new NextResponse("Track not included in purchase", { status: 403 });
    }

    const productIdsRaw = paymentMetadata.productIds || paymentMetadata.productId;
    const firstProductId = productIdsRaw?.split(",")[0];
    const product = firstProductId ? getProduct(firstProductId) : null;
    const fileFormat = product ? getFileFormat(product) : "mp3";

    const downloadKey = `downloads_${trackId}`;
    const currentDownloads = parseInt(paymentMetadata[downloadKey] || "0", 10);

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

    // Track download count on the Stripe object
    const updatedMetadata = { ...paymentMetadata, [downloadKey]: (currentDownloads + 1).toString() };
    if (sessionId.startsWith("pi_")) {
      await stripe.paymentIntents.update(sessionId, { metadata: updatedMetadata });
    } else {
      await stripe.checkout.sessions.update(sessionId, { metadata: updatedMetadata });
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

  // Support comma-separated productIds (in-person) or single productId (online)
  const productIdsRaw = metadata.productIds || metadata.productId;
  if (productIdsRaw) {
    const productIds = productIdsRaw.split(",").filter(Boolean);
    for (const pid of productIds) {
      const product = getProduct(pid);
      if (product) {
        const assets = getDownloadableAssets(product);
        if (assets.includes(trackId)) return true;
      }
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
