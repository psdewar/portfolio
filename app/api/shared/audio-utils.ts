import { NextRequest } from "next/server";
import { list } from "@vercel/blob";
import { checkRateLimit, getClientIP } from "./rate-limit";
import { isValidAsset, isTestAsset } from "./products";

export const ALLOWED_ORIGINS = [
  "https://peytspencer.com",
  "https://www.peytspencer.com",
  "http://localhost:3000",
  "https://peytspencer.vercel.app",
];

export function extractIpAddress(request: NextRequest): string {
  return getClientIP(request);
}

export function checkStreamRateLimit(ip: string): boolean {
  return checkRateLimit(ip, "stream").allowed;
}

export function validateTrackId(trackId: string): boolean {
  return isValidAsset(trackId);
}

export function sanitizeTrackId(trackId: string): string {
  return trackId.replace(/[^a-zA-Z0-9-]/g, "");
}

export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin") || request.headers.get("referer");
  if (!origin) return true;
  return ALLOWED_ORIGINS.some((allowed) => origin.includes(allowed));
}

export function validateOriginStrict(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Generate mock MP3 data for test assets (no Vercel Blob dependency)
 * Returns a minimal valid MP3 frame for testing download flow
 */
function generateMockAudioBuffer(): ArrayBuffer {
  // Minimal MP3 frame header (valid but silent)
  // This is enough to test the download flow without real audio
  const mockMp3 = new Uint8Array([
    0xff,
    0xfb,
    0x90,
    0x00, // MP3 frame header
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    0x00,
    // ID3 tag with test info
    0x49,
    0x44,
    0x33, // "ID3"
    0x04,
    0x00,
    0x00, // version
    0x00,
    0x00,
    0x00,
    0x00, // size
  ]);
  return mockMp3.buffer;
}

/**
 * Fetch audio blob from storage
 * For test assets, returns mock data without Vercel Blob call
 */
export async function fetchAudioBlob(
  trackId: string
): Promise<{ url: string; size: number } | null> {
  // Test assets return mock data - no Vercel Blob dependency
  if (isTestAsset(trackId)) {
    return {
      url: `mock://test/${trackId}.mp3`,
      size: 27, // Size of mock buffer
    };
  }

  // Production assets use Vercel Blob
  const { blobs } = await list({ prefix: `audio/${trackId}.mp3`, limit: 1 });
  let audioBlob = blobs[0];
  if (!audioBlob && trackId !== "patience") {
    const { blobs: fallbackBlobs } = await list({ prefix: `audio/patience.mp3`, limit: 10 });
    audioBlob = fallbackBlobs[0];
  }
  return audioBlob || null;
}

/**
 * Fetch audio buffer from URL
 * For mock URLs (test assets), returns mock audio data
 */
export async function fetchAudioBuffer(blobUrl: string): Promise<ArrayBuffer> {
  // Mock URLs return generated test data
  if (blobUrl.startsWith("mock://")) {
    return generateMockAudioBuffer();
  }

  // Real URLs fetch from storage
  const response = await fetch(blobUrl);
  if (!response.ok) throw new Error("Audio file not found");
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

export function createStreamHeaders(audioBuffer: ArrayBuffer, etag: string, lastModified: string) {
  return {
    "Content-Type": "audio/mpeg",
    "Content-Length": audioBuffer.byteLength.toString(),
    ETag: etag,
    "Last-Modified": lastModified,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

export const createBaseHeaders = createStreamHeaders;

export function parseRangeHeader(range: string, contentLength: number) {
  const parts = range.replace(/bytes=/, "").split("-");
  const start = parseInt(parts[0], 10);
  const end = parts[1] ? parseInt(parts[1], 10) : contentLength - 1;
  if (start < 0 || end >= contentLength || start > end) return null;
  return { start, end };
}

export function createRangeHeaders(start: number, end: number, contentLength: number) {
  return {
    "Content-Range": `bytes ${start}-${end}/${contentLength}`,
    "Content-Length": (end - start + 1).toString(),
  };
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

export function logDevError(error: unknown, context: string) {
  if (process.env.NODE_ENV === "development") console.error(`${context}:`, error);
}

export function logDevWarning(message: string) {
  if (process.env.NODE_ENV === "development") console.warn(message);
}
