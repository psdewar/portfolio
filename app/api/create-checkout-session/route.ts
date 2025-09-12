import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSecureEnv } from "../../../lib/env-validation";
import {
  validateOriginStrict,
  sanitizeCheckoutData,
  logDevError,
  extractIpAddress,
} from "../shared/audio-utils";

const stripe = new Stripe(getSecureEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-08-27.basil",
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIpAddress(request);

    // if (!checkCheckoutRateLimit(ip)) {
    //   return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    // }

    // Verify origin (strict validation for checkout)
    if (!validateOriginStrict(request)) {
      const origin = request.headers.get("origin");
      return NextResponse.json({ error: `Invalid origin ${origin}` }, { status: 403 });
    }

    const body = await request.json();

    // Sanitize and validate checkout data
    const checkoutData = sanitizeCheckoutData(body);
    if (!checkoutData) {
      return NextResponse.json({ error: "Invalid or missing required fields" }, { status: 400 });
    }

    const { amount, trackId, trackTitle, mode, currency } = checkoutData;

    // Create checkout session with secure metadata
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: currency as string,
            product_data: {
              name: mode === "donation" ? `Support for "${trackTitle}"` : `Download: ${trackTitle}`,
              description:
                mode === "donation"
                  ? "Support the artist with your donation"
                  : "High-quality MP3 download",
              metadata: {
                trackId: trackId,
                mode: mode,
              },
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/music?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${
        process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
      }/music?canceled=true`,
      metadata: {
        trackId: trackId,
        trackTitle: trackTitle,
        mode: mode,
        ip: ip,
        timestamp: new Date().toISOString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes expiry
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    logDevError(error, "Stripe session creation error");
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
