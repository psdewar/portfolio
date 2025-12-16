import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, getBaseUrl, getSessionExpiry, createBaseMetadata } from "../shared/stripe-utils";
import { extractIpAddress } from "../shared/audio-utils";

// Map project slug -> Stripe product (or price) id. Extend as you add projects.
// If moving to Prices, switch to price ids and set line_items with price & quantity.
const PROJECT_PRODUCT_MAP: Record<string, string> = {
  "flight-to-boise": "prod_TBTntrJOXSQahO",
};

export async function POST(request: NextRequest) {
  try {
    const ip = extractIpAddress(request);
    const body = await request.json();
    const { amount, projectTitle, projectId } = body;

    // Prevents client tampering
    const productId = PROJECT_PRODUCT_MAP[projectId];

    if (!amount || !projectTitle || !projectId || !productId) {
      console.log("Missing or unknown fields:", { amount, projectTitle, projectId, productId });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount < 1000) {
      console.log("Amount too low:", amount);
      return NextResponse.json({ error: "Minimum amount is $10.00" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Peyt Spencer: Independent Artist",
              description: "Fund my next single",
              metadata: { productId, projectId },
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${getBaseUrl()}/fund/${projectId}?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${getBaseUrl()}/fund/${projectId}?canceled=1`,
      metadata: {
        projectTitle,
        projectId,
        productId,
        type: "project_funding",
        ...createBaseMetadata(ip),
      },
      expires_at: getSessionExpiry(),
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error("Stripe session creation error", error?.message || error);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
