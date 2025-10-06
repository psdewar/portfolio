import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getSecureEnv } from "../../../lib/env-validation";

// Map project slug -> Stripe product (or price) id. Extend as you add projects.
// If moving to Prices, switch to price ids and set line_items with price & quantity.
const PROJECT_PRODUCT_MAP: Record<string, string> = {
  "flight-to-boise": "prod_TBTntrJOXSQahO",
};

const stripe = new Stripe(getSecureEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-08-27.basil",
});

export async function POST(request: NextRequest) {
  try {
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

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Peyt Spencer: ${projectTitle}`,
              description: "Opening for rapper and producer Mark Battles",
              metadata: { productId, projectId },
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/indie/${projectId}?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/indie/${projectId}?canceled=1`,
      metadata: {
        projectTitle,
        projectId,
        productId,
        type: "project_funding",
        timestamp: new Date().toISOString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error: any) {
    console.error("Stripe session creation error", error?.message || error);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
