import { NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { s3, s3Bucket } from "../../shared/s3";
import { getFeatured, setFeatured } from "../../shared/moments";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rate = checkRateLimit(ip, "moments-delete", {
    windowMs: 60 * 60 * 1000,
    maxRequests: 200,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.resetIn / 1000)) } },
    );
  }

  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }
  if (!process.env.MOMENTS_PASSCODE) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.passcode !== process.env.MOMENTS_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = typeof body.key === "string" ? body.key : "";
  if (!key.startsWith("drops/")) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: key }));

  const featured = await getFeatured();
  if (featured.includes(key)) {
    await setFeatured(featured.filter((k) => k !== key));
  }

  return NextResponse.json({ ok: true });
}
