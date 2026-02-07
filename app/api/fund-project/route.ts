import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "../../../lib/tiger";
import { getBaseUrl, createBaseMetadata } from "../shared/stripe-utils";
import { extractIpAddress } from "../shared/audio-utils";

// Map project slug -> Stripe product (or price) id
const PROJECT_PRODUCT_MAP: Record<string, string> = {
  "flight-to-boise": "prod_TBTntrJOXSQahO",
  "monthly-support": "monthly-support",
  "annual-support": "annual-support",
};

// Monthly subscription prices (created in Stripe dashboard)
// Format: net amount in dollars -> Stripe Price ID
const MONTHLY_SUBSCRIPTION_PRICES: Record<number, string> = {
  5: process.env.STRIPE_PRICE_5 || "price_1SsFlJCWIzpWuQGpUFEWyA9B",
  10: process.env.STRIPE_PRICE_10 || "price_1SsOrlCWIzpWuQGpYyVtnsuZ",
  25: process.env.STRIPE_PRICE_25 || "price_1SsOrmCWIzpWuQGpsbSDaxJu",
  100: process.env.STRIPE_PRICE_100 || "price_1SsOrnCWIzpWuQGpOLKEwX7L",
};

// Annual subscription prices (created in Stripe dashboard)
// Format: net amount in dollars (yearly total) -> Stripe Price ID
// Annual = 10x monthly (2 months free discount)
const ANNUAL_SUBSCRIPTION_PRICES: Record<number, string> = {
  50: process.env.STRIPE_PRICE_ANNUAL_50 || "price_1SsFlTCWIzpWuQGp6EK94Npo",   // $5/mo equivalent
  100: process.env.STRIPE_PRICE_ANNUAL_100 || "price_1SsOrlCWIzpWuQGpqyg2NwtF", // $10/mo equivalent
  250: process.env.STRIPE_PRICE_ANNUAL_250 || "price_1SsOrnCWIzpWuQGpky3nWJ3V", // $25/mo equivalent
  1000: process.env.STRIPE_PRICE_ANNUAL_1000 || "price_1SsOrnCWIzpWuQGppDU3PcJk", // $100/mo equivalent
};

// Per-project minimum amounts in cents
const PROJECT_MINIMUMS: Record<string, number> = {
  "monthly-support": 100, // $1 minimum
  "annual-support": 1000, // $10 minimum for annual
};
const DEFAULT_MINIMUM = 1000; // $10 for project funding

export async function POST(request: NextRequest) {
  try {
    const ip = extractIpAddress(request);
    const body = await request.json();
    const { amount, projectTitle, projectId, interval = "month", customerEmail } = body;

    const productId = PROJECT_PRODUCT_MAP[projectId];

    if (!amount || !projectTitle || !projectId || !productId) {
      console.log("Missing or unknown fields:", { amount, projectTitle, projectId, productId });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const minAmount = PROJECT_MINIMUMS[projectId] ?? DEFAULT_MINIMUM;
    if (amount < minAmount) {
      return NextResponse.json(
        { error: `Minimum amount is $${(minAmount / 100).toFixed(2)}` },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl(request);
    const isMonthlySupport = projectId === "monthly-support";
    const isAnnualSupport = projectId === "annual-support";
    const isPatronSupport = isMonthlySupport || isAnnualSupport;

    // Redirect paths - check referer to determine where user came from
    const referer = request.headers.get("referer") || "";
    const fromLive = referer.includes("/live");

    let successPath: string;
    let cancelPath: string;

    if (isPatronSupport) {
      if (fromLive) {
        successPath = "/live?thanks=1";
        cancelPath = "/live";
      } else {
        successPath = "/patron?thanks=1&session_id={CHECKOUT_SESSION_ID}";
        cancelPath = "/patron?canceled=1";
      }
    } else {
      successPath = `/fund/${projectId}?success=1&session_id={CHECKOUT_SESSION_ID}`;
      cancelPath = `/fund/${projectId}?canceled=1`;
    }

    // For monthly/annual support, try to use subscription pricing if available
    // The amount passed is the charge amount (including fees)
    // We need to find the matching subscription price by the NET amount
    const netAmountDollars = Math.round((amount * 0.971 - 30) / 100);
    const isAnnual = interval === "year";
    const priceTable = isAnnual ? ANNUAL_SUBSCRIPTION_PRICES : MONTHLY_SUBSCRIPTION_PRICES;
    const subscriptionPriceId = isPatronSupport ? priceTable[netAmountDollars] : null;
    const useSubscription = isPatronSupport && subscriptionPriceId;

    const checkoutRequest: Parameters<typeof createCheckout>[0] = {
      mode: useSubscription ? "subscription" : "payment",
      successUrl: `${baseUrl}${successPath}`,
      cancelUrl: `${baseUrl}${cancelPath}`,
      metadata: {
        projectTitle,
        projectId,
        productId,
        type: useSubscription ? "subscription" : "support",
        ...createBaseMetadata(ip),
      },
      ...(customerEmail && { customerEmail }),
    };

    if (useSubscription) {
      // Use pre-created recurring price from Stripe
      checkoutRequest.priceId = subscriptionPriceId;
    } else {
      // Fall back to one-time payment with inline pricing
      checkoutRequest.lineItems = [
        {
          name: isPatronSupport ? "Support My Independence" : "Peyt Spencer: Independent Artist",
          description: isPatronSupport ? "Your support funds my music" : "Fund my next single",
          amountCents: amount,
          quantity: 1,
        },
      ];
    }

    const { sessionId, url } = await createCheckout(checkoutRequest);

    return NextResponse.json({ sessionId, url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Stripe session creation error:", message);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
