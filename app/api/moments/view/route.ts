import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, s3Bucket } from "../../shared/s3";
import { getFeatured } from "../../shared/moments";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

const VIEW_TTL = 21600;

export async function GET(request: Request) {
  if (!s3 || !s3Bucket) return NextResponse.json({ error: "Unavailable" }, { status: 503 });
  const ip = getClientIP(request);
  const rate = checkRateLimit(ip, "moments-view", { windowMs: 60 * 1000, maxRequests: 120 });
  if (!rate.allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const key = new URL(request.url).searchParams.get("key") || "";
  const featured = await getFeatured();
  if (!featured.includes(key)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: s3Bucket, Key: key }), {
    expiresIn: VIEW_TTL,
  });
  return NextResponse.json(
    { url },
    { headers: { "Cache-Control": "private, max-age=3600" } },
  );
}
