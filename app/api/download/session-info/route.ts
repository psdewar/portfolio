import { NextResponse } from "next/server";
import Stripe from "stripe";
import { validateOrigin } from "../../shared/audio-utils";
import { getSecureEnv } from "../../../../lib/env-validation";

export const dynamic = "force-dynamic";

const stripe = new Stripe(getSecureEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-08-27.basil",
});

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

    // Retrieve session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify payment status
    if (session.payment_status !== "paid") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
    }

    // Return relevant session data
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
