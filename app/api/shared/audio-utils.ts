import { NextRequest } from "next/server";
import { list } from "@vercel/blob";
import Stripe from "stripe";

// Shared constants
export const ALLOWED_TRACK_IDS = [
  "patience",
  "safe",
  "right-one",
  "where-i-wanna-be",
  "mula-freestyle",
];
export const ALLOWED_ORIGINS = [
  "https://peytspencer.com",
  "https://www.peytspencer.com",
  "http://localhost:3000",
];

// Session expiry time (24 hours)
export const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

// Rate limiting maps
const streamRateLimit = new Map<string, { count: number; resetTime: number }>();
const downloadRateLimit = new Map<string, { count: number; resetTime: number }>();
const checkoutRateLimit = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configurations
export const RATE_LIMIT_CONFIG = {
  stream: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    maxRequests: 50,
  },
  download: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 1,
  },
  checkout: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
  },
};

// Generic rate limiting function
function checkRateLimit(
  ip: string,
  type: "stream" | "download" | "checkout",
  rateLimitMap: Map<string, { count: number; resetTime: number }>
): boolean {
  const now = Date.now();
  const config = RATE_LIMIT_CONFIG[type];
  const key = `${type}_${ip}`;
  const current = rateLimitMap.get(key);

  if (!current || now > current.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + config.windowMs });
    return true;
  }

  if (current.count >= config.maxRequests) {
    return false;
  }

  current.count++;
  return true;
}

export function checkStreamRateLimit(ip: string): boolean {
  return checkRateLimit(ip, "stream", streamRateLimit);
}

export function checkDownloadRateLimit(ip: string): boolean {
  return checkRateLimit(ip, "download", downloadRateLimit);
}

export function checkCheckoutRateLimit(ip: string): boolean {
  return checkRateLimit(ip, "checkout", checkoutRateLimit);
}

export function sanitizeTrackId(trackId: string): string {
  return trackId.replace(/[^a-zA-Z0-9-]/g, "");
}

export function extractIpAddress(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0] : request.ip || "unknown";
}

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin") || request.headers.get("referer");

  if (!origin) return true; // Allow requests without origin header

  return ALLOWED_ORIGINS.some((allowed) => origin.includes(allowed));
}

export function validateOriginStrict(request: NextRequest): boolean {
  const origin = request.headers.get("origin");

  if (!origin) return false; // Require origin header for strict validation

  return ALLOWED_ORIGINS.includes(origin);
}

export function validateTrackId(trackId: string): boolean {
  return ALLOWED_TRACK_IDS.includes(trackId);
}

export async function fetchAudioBlob(trackId: string) {
  const { blobs } = await list({ prefix: `audio/${trackId}.mp3`, limit: 1 });

  // Fallback to patience if specific track not found (for development)
  let audioBlob = blobs[0];
  if (!audioBlob && trackId !== "patience") {
    const { blobs: fallbackBlobs } = await list({ prefix: `audio/patience.mp3`, limit: 10 });
    audioBlob = fallbackBlobs[0];
  }

  return audioBlob;
}

export async function fetchAudioBuffer(blobUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(blobUrl);

  if (!response.ok) {
    throw new Error("Audio file not found");
  }

  return response.arrayBuffer();
}

export function generateETag(audioBuffer: ArrayBuffer): string {
  return `"${Buffer.from(audioBuffer).toString("base64").substring(0, 32)}"`;
}

export function checkConditionalHeaders(
  request: NextRequest,
  etag: string,
  lastModified: string
): boolean {
  const ifNoneMatch = request.headers.get("if-none-match");
  const ifModifiedSince = request.headers.get("if-modified-since");

  return (
    ifNoneMatch === etag ||
    (ifModifiedSince !== null && new Date(ifModifiedSince) >= new Date(lastModified))
  );
}

export function createBaseHeaders(audioBuffer: ArrayBuffer, etag: string, lastModified: string) {
  return {
    "Content-Type": "audio/mpeg",
    "Content-Length": audioBuffer.byteLength.toString(),
    ETag: etag,
    "Last-Modified": lastModified,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

export function parseRangeHeader(range: string, contentLength: number) {
  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;

  // Validate range values
  if (start < 0 || end >= contentLength || start > end) {
    return null;
  }

  return { start, end };
}

export function createRangeHeaders(start: number, end: number, contentLength: number) {
  const chunkSize = end - start + 1;

  return {
    "Content-Range": `bytes ${start}-${end}/${contentLength}`,
    "Content-Length": chunkSize.toString(),
  };
}

export function logDevError(error: unknown, context: string) {
  if (process.env.NODE_ENV === "development") {
    console.error(`${context}:`, error);
  }
}

export function logDevWarning(message: string) {
  if (process.env.NODE_ENV === "development") {
    console.warn(message);
  }
}

// Stripe session verification utilities
export async function verifyStripeSession(
  stripe: Stripe,
  sessionId: string,
  trackId: string
): Promise<{ success: boolean; error?: string; status?: number }> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return { success: false, error: "Payment not completed", status: 402 };
    }

    // Verify session metadata matches request
    if (session.metadata?.trackId !== trackId) {
      return { success: false, error: "Invalid session for this track", status: 403 };
    }

    // Check session expiry (downloads valid for 24 hours after payment)
    const paymentTime = session.created * 1000; // Convert to milliseconds
    const expiryTime = paymentTime + SESSION_EXPIRY_MS;

    if (Date.now() > expiryTime) {
      return { success: false, error: "Download link expired", status: 410 };
    }

    return { success: true };
  } catch (stripeError) {
    logDevError(stripeError, "Stripe session verification error");
    return { success: false, error: "Payment verification failed", status: 401 };
  }
}

export function formatTrackFilename(trackId: string): string {
  return `peyt-spencer-${trackId}.mp3`;
}

export function createDownloadHeaders(audioBuffer: ArrayBuffer, filename: string) {
  return {
    "Content-Type": "audio/mpeg",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Content-Length": audioBuffer.byteLength.toString(),
    "Cache-Control": "private, no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

// Checkout session utilities
export function sanitizeInput(input: any): string {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[<>"/\\&]/g, "");
}

export function validateAmount(amount: any): boolean {
  return typeof amount === "number" && amount >= 50 && amount <= 100000;
}

export function validateCheckoutFields(
  amount: any,
  trackId: any,
  trackTitle: any,
  mode: any
): boolean {
  return !!(amount && trackId && trackTitle && mode);
}

export interface CheckoutSessionData {
  amount: number;
  trackId: string;
  trackTitle: string;
  mode: string;
  currency?: string;
}

export function sanitizeCheckoutData(data: any): CheckoutSessionData | null {
  const { amount, trackId, trackTitle, mode, currency = "usd" } = data;
  if (!validateCheckoutFields(amount, trackId, trackTitle, mode)) {
    return null;
  }
  if (!validateAmount(amount)) {
    return null;
  }
  const sanitizedTrackId = sanitizeInput(trackId);
  const sanitizedTrackTitle = sanitizeInput(trackTitle);
  const sanitizedMode = sanitizeInput(mode);

  if (!sanitizedTrackId || !sanitizedTrackTitle || !sanitizedMode) {
    return null;
  }
  if (!validateTrackId(sanitizedTrackId)) {
    return null;
  }

  return {
    amount,
    trackId: sanitizedTrackId,
    trackTitle: sanitizedTrackTitle,
    mode: sanitizedMode,
    currency: sanitizeInput(currency) || "usd",
  };
}
