import { NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rateCheck = checkRateLimit(ip, "moments", {
    windowMs: 60 * 60 * 1000,
    maxRequests: 20,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)) },
      },
    );
  }

  const body = await request.json().catch(() => ({}));
  const passcode = typeof body.passcode === "string" ? body.passcode : "";
  const expected = process.env.MOMENTS_PASSCODE;

  if (!expected) {
    return NextResponse.json({ error: "Uploads are not configured yet." }, { status: 503 });
  }

  if (passcode.trim() !== expected) {
    return NextResponse.json({ error: "Wrong passcode" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
