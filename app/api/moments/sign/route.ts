import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";
import { s3, s3Bucket } from "../../shared/s3";
import { createUploadUrl, contentKey, objectExists } from "../../shared/moments";

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rateCheck = checkRateLimit(ip, "moments-sign", {
    windowMs: 60 * 60 * 1000,
    maxRequests: 200,
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

  const body = await request.json().catch(() => ({}));
  const { passcode, filename, contentType, hash } = body as Record<string, string>;

  if (passcode !== process.env.MOMENTS_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!filename) {
    return NextResponse.json({ error: "Missing filename" }, { status: 400 });
  }

  const validHash =
    typeof hash === "string" && /^[a-f0-9]{64}$/.test(hash) ? hash : "";

  try {
    if (validHash) {
      const key = contentKey(filename, validHash);
      if (await objectExists(key)) {
        return NextResponse.json({ key, exists: true });
      }
      const { url } = await createUploadUrl(filename, contentType, key);
      return NextResponse.json({ url, key, exists: false });
    }
    const { url, key } = await createUploadUrl(filename, contentType);
    return NextResponse.json({ url, key });
  } catch (err) {
    console.error("[moments/sign] error", err);
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 });
  }
}
