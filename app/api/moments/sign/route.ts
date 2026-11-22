import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";
import { isUploadAuthorized, checkinIdFromPasscode } from "../../shared/moments-auth";
import { isAdminAuthorized } from "../../shared/admin-auth";
import { checkinMetadata } from "../../shared/checkin-metadata";
import { s3, s3Bucket } from "../../shared/s3";
import {
  createUploadUrl,
  contentKey,
  objectExists,
  previewKeyFor,
  recordCityFromCoords,
  coordsFrom,
} from "../../shared/moments";

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const body = await request.json().catch(() => ({}));
  const kind = (body as Record<string, unknown>).kind;
  const rateCheck = (await isAdminAuthorized(request))
    ? { allowed: true, resetIn: 0 }
    : kind === "check"
      ? checkRateLimit(ip, "moments-check", {
          windowMs: 60 * 60 * 1000,
          maxRequests: 1000,
        })
      : checkRateLimit(ip, "moments-sign", {
          windowMs: 60 * 60 * 1000,
          maxRequests: 600,
        });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)) },
      },
    );
  }

  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }
  if (!process.env.MOMENTS_PASSCODE) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const { passcode, filename, contentType, hash } = body as Record<string, string>;

  if (!(await isUploadAuthorized(request, passcode))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }

  const metadata = checkinMetadata(checkinIdFromPasscode(passcode));
  const validHash =
    typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash) ? hash : "";
  const capturedRaw = (body as Record<string, unknown>).captured;
  const captured =
    typeof capturedRaw === "number" && Number.isFinite(capturedRaw) && capturedRaw > 0
      ? Math.floor(capturedRaw)
      : undefined;

  try {
    if (kind === "check") {
      if (!validHash) return NextResponse.json({ exists: false });
      const key = contentKey(filename, validHash, captured);
      return NextResponse.json({ key, exists: await objectExists(key) });
    }
    if (kind === "preview") {
      if (!validHash) {
        return NextResponse.json({ error: "Preview requires a hash" }, { status: 400 });
      }
      const originalKey = contentKey(filename, validHash, captured);
      const key = previewKeyFor(originalKey);
      if (await objectExists(key)) {
        return NextResponse.json({ key, originalKey, exists: true });
      }
      const { url } = await createUploadUrl(filename, "image/jpeg", key, metadata);
      return NextResponse.json({ url, key, originalKey, exists: false });
    }
    if (validHash) {
      const key = contentKey(filename, validHash, captured);
      if (await objectExists(key)) {
        return NextResponse.json({ key, exists: true });
      }
      const coords = coordsFrom(body as Record<string, unknown>);
      if (coords) await recordCityFromCoords(key, coords.lat, coords.lng);
      const { url } = await createUploadUrl(filename, contentType, key, metadata);
      return NextResponse.json({ url, key, exists: false });
    }
    const { url, key } = await createUploadUrl(filename, contentType, undefined, metadata);
    return NextResponse.json({ url, key });
  } catch (err) {
    console.error("[moments/sign] error", err);
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 });
  }
}
