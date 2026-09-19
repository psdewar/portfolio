import { NextRequest, NextResponse } from "next/server";
import { verifySlug } from "../../lib/confirm";
import { findActivePatron, setPatronCookie } from "../shared/patron-lookup";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const sig = request.nextUrl.searchParams.get("sig") || undefined;
  if (!email || !verifySlug(email, sig)) {
    return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  }
  const patron = await findActivePatron(email);
  if (!patron) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }
  return setPatronCookie(NextResponse.json({ email: patron.email, tier: patron.tier }));
}
