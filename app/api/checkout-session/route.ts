import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../shared/stripe-utils";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return NextResponse.json({
      email: session.customer_details?.email || session.customer_email,
      name: session.customer_details?.name,
    });
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
