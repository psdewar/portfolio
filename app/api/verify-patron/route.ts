import { NextRequest, NextResponse } from "next/server";
import { findActivePatron, setPatronCookie } from "../shared/patron-lookup";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }

    const patron = await findActivePatron(email);

    if (!patron) {
      return NextResponse.json({ error: "No active subscription" }, { status: 404 });
    }

    return setPatronCookie(NextResponse.json({ success: true, email: patron.email, tier: patron.tier }));
  } catch (error) {
    console.error("Verify patron error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
