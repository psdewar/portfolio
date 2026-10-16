import { NextResponse } from "next/server";
import { s3, s3Bucket } from "../../shared/s3";
import { isMomentsAuthorized, canDeleteMoment } from "../../shared/moments-auth";
import { deleteMoment } from "../../shared/moments";
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
  if (!(await isMomentsAuthorized(body.passcode))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const key = typeof body.key === "string" ? body.key : "";
  if (!key.startsWith("drops/")) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  if (!(await canDeleteMoment(body.passcode, key))) {
    return NextResponse.json({ error: "You can only remove your own uploads." }, { status: 403 });
  }

  await deleteMoment(key);

  return NextResponse.json({ ok: true });
}
