import { NextResponse } from "next/server";
import { getFeatured, recordDims } from "../../shared/moments";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rate = checkRateLimit(ip, "moments-dims", { windowMs: 60 * 1000, maxRequests: 60 });
  if (!rate.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const entries = body?.dims;
  if (!entries || typeof entries !== "object") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const featured = new Set(await getFeatured());
  const filtered: Record<string, [number, number]> = {};
  for (const [key, dim] of Object.entries(entries)) {
    if (
      featured.has(key) &&
      Array.isArray(dim) &&
      dim.length === 2 &&
      Number.isFinite(Number(dim[0])) &&
      Number.isFinite(Number(dim[1]))
    ) {
      filtered[key] = [Number(dim[0]), Number(dim[1])];
    }
  }

  await recordDims(filtered);
  return NextResponse.json({ ok: true });
}
