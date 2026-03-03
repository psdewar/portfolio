import { NextResponse } from "next/server";
import Stripe from "stripe";
import { validateOrigin } from "../../shared/audio-utils";
import { stripe } from "../../shared/stripe-utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Rate limiting and origin verification
    // const ip = extractIpAddress(request as any);
    // if (!checkDownloadRateLimit(ip)) {
    //   return new NextResponse("Too many requests", { status: 429 });
    // }

    if (!validateOrigin(request as any)) {
      return new NextResponse("Unauthorized origin", { status: 403 });
    }

    // Get session ID from query parameters
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID required" }, { status: 400 });
    }

    // Retrieve payment record — PaymentIntent for in-person, Checkout Session for online
    if (sessionId.startsWith("pi_")) {
      const pi = await stripe.paymentIntents.retrieve(sessionId);
      if (pi.status !== "succeeded") {
        return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
      }
      return NextResponse.json({
        trackId: pi.metadata?.trackId,
        trackTitle: pi.metadata?.trackTitle,
        mode: pi.metadata?.mode,
        channel: pi.metadata?.channel,
        paymentStatus: "paid",
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }
    return NextResponse.json({
      trackId: session.metadata?.trackId,
      trackTitle: session.metadata?.trackTitle,
      mode: session.metadata?.mode,
      paymentStatus: session.payment_status,
    });
  } catch (error) {
    console.error("Error retrieving session info:", error);
    return NextResponse.json({ error: "Failed to retrieve session information" }, { status: 500 });
  }
}
