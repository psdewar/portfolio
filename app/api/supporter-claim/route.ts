import { NextRequest, NextResponse } from "next/server";
import { verifySlug } from "../../lib/confirm";
import { findActiveSupporter, setSupporterCookie } from "../shared/supporter-lookup";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const sig = request.nextUrl.searchParams.get("sig") || undefined;
  if (!email || !verifySlug(email, sig)) {
    return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  }
  const supporter = await findActiveSupporter(email);
  if (!supporter) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }
  return setSupporterCookie(NextResponse.json({ email: supporter.email, tier: supporter.tier }), supporter.email);
}
