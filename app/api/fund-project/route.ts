import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "../../../lib/tiger";
import { getBaseUrl, createBaseMetadata } from "../shared/stripe-utils";
import { extractIpAddress } from "../shared/audio-utils";

// Map project slug -> Stripe product (or price) id. Extend as you add projects.
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
      console.log("Missing or unknown fields:", {
        amount,
        projectTitle,
        projectId,
        productId,
      });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (amount < 1000) {
      console.log("Amount too low:", amount);
      return NextResponse.json({ error: "Minimum amount is $10.00" }, { status: 400 });
    }

    const baseUrl = getBaseUrl();

    const { sessionId, url } = await createCheckout({
      mode: "payment",
      successUrl: `${baseUrl}/fund/${projectId}?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/fund/${projectId}?canceled=1`,
      lineItems: [
        {
          name: "Peyt Spencer: Independent Artist",
          description: "Fund my next single",
          amountCents: amount,
          quantity: 1,
        },
      ],
      metadata: {
        projectTitle,
        projectId,
        productId,
        type: "project_funding",
        ...createBaseMetadata(ip),
      },
    });

    return NextResponse.json({ sessionId, url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Stripe session creation error", message);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
