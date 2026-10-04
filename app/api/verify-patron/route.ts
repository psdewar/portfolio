import { NextResponse } from "next/server";
import { findActivePatron, setPatronCookie } from "../shared/patron-lookup";
import { readSession } from "../../../lib/session";

export async function POST(request: Request) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  try {
    const patron = await findActivePatron(session.email);

    if (!patron) {
      return NextResponse.json({ error: "No active subscription" }, { status: 404 });
    }

    return setPatronCookie(NextResponse.json({ success: true, email: patron.email, tier: patron.tier }));
  } catch (error) {
    console.error("Verify patron error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
