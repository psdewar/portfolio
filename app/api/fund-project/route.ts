import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "../../../lib/tiger";
import { getBaseUrl, createBaseMetadata, stripe } from "../shared/stripe-utils";
import { extractIpAddress } from "../shared/audio-utils";
import { stripeFeeCents, MAX_CARD_GROSS_CENTS } from "../../lib/fees";
import { PATRON_TIER_BASE } from "../../data/patron-config";

// Map project slug -> Stripe product (or price) id
const PROJECT_PRODUCT_MAP: Record<string, string> = {
  boise: "prod_TBTntrJOXSQahO",
  "monthly-support": "monthly-support",
  "annual-support": "annual-support",
};

const MONTHLY_SUBSCRIPTION_PRICES: Record<number, string> = {
  10: process.env.STRIPE_PRICE_10 || "price_1UIbyNCWIzpWuQGpCIAh3Vza",
  20: process.env.STRIPE_PRICE_20 || "price_1UHdiUCWIzpWuQGp47pAiUwy",
  50: process.env.STRIPE_PRICE_50 || "price_1UHommCWIzpWuQGp1DaWMBUm",
  100: process.env.STRIPE_PRICE_100 || "price_1SsOrnCWIzpWuQGpOLKEwX7L",
};

const ANNUAL_SUBSCRIPTION_PRICES: Record<number, string> = {
  100: process.env.STRIPE_PRICE_ANNUAL_100 || "price_1UIbyNCWIzpWuQGpy6DLu1Zu",
  200: process.env.STRIPE_PRICE_ANNUAL_200 || "price_1UHommCWIzpWuQGpaVofunWF",
  500: process.env.STRIPE_PRICE_ANNUAL_500 || "price_1UHomnCWIzpWuQGptzYwuzJ5",
  1000:
    process.env.STRIPE_PRICE_ANNUAL_1000 || "price_1UHomnCWIzpWuQGpfG1LYkN0",
};

const SOUL_MONTHLY_PRODUCT =
  process.env.STRIPE_PRODUCT_SOUL || "prod_Tq51rjgmSMyLPJ";
const SOUL_ANNUAL_PRODUCT =
  process.env.STRIPE_PRODUCT_SOUL_ANNUAL || "prod_VIEAF2GYSkGshj";
const CUSTOM_MINIMUM_NET = PATRON_TIER_BASE[PATRON_TIER_BASE.length - 1].net;

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
    const {
      amount,
      projectTitle,
      projectId,
      interval = "month",
      customerEmail,
      embedded = false,
    } = body;

    const productId = PROJECT_PRODUCT_MAP[projectId];

    if (!amount || !projectTitle || !projectId || !productId) {
      console.log("Missing or unknown fields:", {
        amount,
        projectTitle,
        projectId,
        productId,
      });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (typeof amount !== "number" || amount > MAX_CARD_GROSS_CENTS) {
      return NextResponse.json(
        { error: "Card checkout is up to $10,000" },
        { status: 400 },
      );
    }

    const minAmount = PROJECT_MINIMUMS[projectId] ?? DEFAULT_MINIMUM;
    if (amount < minAmount) {
      return NextResponse.json(
        { error: `Minimum amount is $${(minAmount / 100).toFixed(2)}` },
        { status: 400 },
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
        successPath =
          "/listen?patron_welcome=1&session_id={CHECKOUT_SESSION_ID}";
        cancelPath = "/support?canceled=1";
      }
    } else {
      successPath = `/fund/${projectId}?success=1&session_id={CHECKOUT_SESSION_ID}`;
      cancelPath = `/fund/${projectId}?canceled=1`;
    }

    const netAmountDollars = (amount - stripeFeeCents(amount)) / 100;
    const isAnnual = interval === "year";
    const priceTable = isAnnual
      ? ANNUAL_SUBSCRIPTION_PRICES
      : MONTHLY_SUBSCRIPTION_PRICES;
    const subscriptionPriceId =
      isPatronSupport && Number.isInteger(netAmountDollars)
        ? priceTable[netAmountDollars]
        : null;
    const customMinimumNet = isAnnual
      ? CUSTOM_MINIMUM_NET * 10
      : CUSTOM_MINIMUM_NET;
    if (
      isPatronSupport &&
      !subscriptionPriceId &&
      netAmountDollars < customMinimumNet
    ) {
      return NextResponse.json(
        { error: `Minimum custom amount is $${customMinimumNet}` },
        { status: 400 },
      );
    }
    const priceId = isPatronSupport
      ? (subscriptionPriceId ??
        (
          await stripe.prices.create({
            unit_amount: amount,
            currency: "usd",
            recurring: { interval: isAnnual ? "year" : "month" },
            product: isAnnual ? SOUL_ANNUAL_PRODUCT : SOUL_MONTHLY_PRODUCT,
          })
        ).id)
      : null;
    const useSubscription = !!priceId;

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
      checkoutRequest.priceId = priceId;
    } else {
      // Fall back to one-time payment with inline pricing
      checkoutRequest.lineItems = [
        {
          name: isPatronSupport
            ? "Support My Independence"
            : "Peyt Spencer: Independent Artist",
          description: isPatronSupport
            ? "Your support funds my music"
            : "Fund my next single",
          amountCents: amount,
          quantity: 1,
        },
      ];
    }

    if (embedded) {
      checkoutRequest.uiMode = "embedded";
      checkoutRequest.returnUrl = `${baseUrl}${successPath}`;
      const { clientSecret } = await createCheckout(checkoutRequest);
      return NextResponse.json({ clientSecret });
    }

    const { sessionId, url } = await createCheckout(checkoutRequest);

    return NextResponse.json({ sessionId, url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Stripe session creation error:", message);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 },
    );
  }
}
