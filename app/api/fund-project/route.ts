import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "../../../lib/tiger";
import { getBaseUrl, createBaseMetadata } from "../shared/stripe-utils";
import { extractIpAddress } from "../shared/audio-utils";

// Map project slug -> Stripe product (or price) id. Extend as you add projects.
const PROJECT_PRODUCT_MAP: Record<string, string> = {
  "flight-to-boise": "prod_TBTntrJOXSQahO",
  "live-stream": "live-stream-tip", // Tips don't need a product, handled specially
};

// Per-project minimum amounts in cents
const PROJECT_MINIMUMS: Record<string, number> = {
  "live-stream": 100, // $1 minimum for tips
};
const DEFAULT_MINIMUM = 1000; // $10 for project funding

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

    const minAmount = PROJECT_MINIMUMS[projectId] ?? DEFAULT_MINIMUM;
    if (amount < minAmount) {
      console.log("Amount too low:", amount);
      return NextResponse.json(
        { error: `Minimum amount is $${(minAmount / 100).toFixed(2)}` },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(request);
    const isLiveStream = projectId === "live-stream";

    // Live stream tips redirect back to /live, project funding goes to /fund page
    const successPath = isLiveStream
      ? "/live?thanks=1"
      : `/fund/${projectId}?success=1&session_id={CHECKOUT_SESSION_ID}`;
    const cancelPath = isLiveStream ? "/live" : `/fund/${projectId}?canceled=1`;

    const { sessionId, url } = await createCheckout({
      mode: "payment",
      successUrl: `${baseUrl}${successPath}`,
      cancelUrl: `${baseUrl}${cancelPath}`,
      lineItems: [
        {
          name: isLiveStream ? "Support My Independence" : "Peyt Spencer: Independent Artist",
          description: isLiveStream ? "Your generosity is appreciated" : "Fund my next single",
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
    console.error("Stripe session creation error:", message);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
