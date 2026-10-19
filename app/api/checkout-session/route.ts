import { NextRequest, NextResponse } from "next/server";
import { stripe } from "../shared/stripe-utils";
import { isSupporterSession, setSupporterCookie, supporterSessionIsCurrent, tierFromSession } from "../shared/supporter-lookup";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    const tier = tierFromSession(session);

    const email = session.customer_details?.email || session.customer_email;
    const supporter = isSupporterSession(session);
    const paid = session.payment_status === "paid";
    const response = NextResponse.json({
      email,
      name: session.customer_details?.name,
      paid,
      supporter,
      tier,
    });
    return paid && supporter && email && supporterSessionIsCurrent(session) ? setSupporterCookie(response, email) : response;
  } catch (error) {
    console.error("Error retrieving checkout session:", error);
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
}
