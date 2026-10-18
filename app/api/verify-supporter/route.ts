import { NextResponse } from "next/server";
import { findActiveSupporter, setSupporterCookie } from "../shared/supporter-lookup";
import { readSession } from "../../../lib/session";

export async function POST(request: Request) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const supporter = await findActiveSupporter(session.email);

    if (!supporter) {
      return NextResponse.json({ error: "No active subscription" }, { status: 404 });
    }

    return setSupporterCookie(NextResponse.json({ success: true, email: supporter.email, tier: supporter.tier }), supporter.email);
  } catch (error) {
    console.error("Verify supporter error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
