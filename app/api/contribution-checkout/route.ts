import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "../../../lib/tiger";
import { getBaseUrl, createBaseMetadata } from "../shared/stripe-utils";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";
import { feeCents, MAX_CARD_GROSS_CENTS } from "../../lib/fees";
import { getLeg } from "../../fund/legs";

const TRIP_ITEMS: Record<string, { name: string; description: string }> = {
  flight: {
    name: "Flight",
    description: "round-trip, includes checked bags for equipment",
  },
  car: { name: "Rental car", description: "includes gas, tolls, and parking" },
  lodging: { name: "Lodging", description: "hotel, Airbnb, or local host" },
  food: {
    name: "Food",
    description: "breakfast, lunch, and dinner on the road",
  },
  buffer: {
    name: "Just in case",
    description: "life happens, like cancellations out of my control",
  },
  honorarium: {
    name: "Honorarium",
    description: "gift for the concert, separate from tour expenses",
  },
  tour: { name: "Contribution", description: "helps fund the next tour stop" },
  support: {
    name: "One-time contribution",
    description: "Thank you for your generosity!",
  },
};

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    const rateCheck = checkRateLimit(ip, "checkout");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const { items, trip, feeIncluded } = body;

    if (!Array.isArray(items) || items.length === 0 || items.length > 12) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    const safeTrip =
      typeof trip === "string" && /^[a-z0-9-]{1,32}$/.test(trip)
        ? trip
        : "tour";

    const fund = (await getLeg(safeTrip))?.fund;
    const legLines = Object.fromEntries(
      (fund?.lines ?? []).map((l) => [
        l.key,
        { name: l.label, description: l.note },
      ]),
    );

    const lineItems = [];
    const breakdown: Record<string, number> = {};
    let total = 0;
    for (const item of items) {
      const meta = legLines[item?.key] ?? TRIP_ITEMS[item?.key];
      const amountCents = item?.amountCents;
      if (
        !meta ||
        typeof amountCents !== "number" ||
        !Number.isFinite(amountCents) ||
        amountCents < 1 ||
        amountCents > MAX_CARD_GROSS_CENTS
      ) {
        return NextResponse.json({ error: "Invalid item" }, { status: 400 });
      }
      const cents = Math.round(amountCents);
      total += cents;
      breakdown[item.key] = (breakdown[item.key] ?? 0) + cents;
      lineItems.push({
        name: meta.name,
        description: meta.description,
        amountCents: cents,
        quantity: 1,
      });
    }

    if (total < 100) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (feeIncluded !== true) {
      lineItems.push({
        name: "card fee",
        description: "",
        amountCents: feeCents(total),
        quantity: 1,
      });
    }

    const dollars = (c: number) =>
      `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;
    const checkoutItems =
      lineItems.length > 1
        ? [
            {
              name: fund
                ? `${fund.shortName} tour, From The Ground Up`
                : "From The Ground Up tour",
              description: lineItems
                .map((l) => `${l.name} ${dollars(l.amountCents)}`)
                .join(", "),
              amountCents: lineItems.reduce((sum, l) => sum + l.amountCents, 0),
              quantity: 1,
            },
          ]
        : lineItems;

    const baseUrl = getBaseUrl(request);

    const { clientSecret } = await createCheckout({
      mode: "payment",
      uiMode: "embedded",
      successUrl: `${baseUrl}/build`,
      cancelUrl: `${baseUrl}/build`,
      metadata: {
        ...createBaseMetadata(ip),
        trip: safeTrip,
        type: "contribution",
        breakdown: JSON.stringify(breakdown),
      },
      lineItems: checkoutItems,
    });

    return NextResponse.json({ clientSecret });
  } catch (error) {
    console.error("Contribution checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 },
    );
  }
}
