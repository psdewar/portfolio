import { NextRequest, NextResponse } from "next/server";
import { createCheckout } from "../../../lib/tiger";
import { getBaseUrl, createBaseMetadata } from "../shared/stripe-utils";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";

const TRIP_ITEMS: Record<string, { name: string; description: string }> = {
  flight: { name: "Flight", description: "round-trip, includes checked bags for equipment" },
  car: { name: "Rental car", description: "includes gas, tolls, and parking" },
  lodging: { name: "Lodging", description: "hotel, Airbnb, or local host" },
  food: { name: "Food", description: "breakfast, lunch, and dinner on the road" },
  buffer: { name: "Just in case", description: "life happens, like cancellations out of my control" },
  honorarium: { name: "Honorarium", description: "recognizes the artistic performance itself" },
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
          headers: { "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)) },
        },
      );
    }

    const body = await request.json();
    const { items, trip } = body;

    if (!Array.isArray(items) || items.length === 0 || items.length > 12) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    const safeTrip =
      typeof trip === "string" && /^[a-z0-9-]{1,32}$/.test(trip) ? trip : "tour";

    const lineItems = [];
    const breakdown: Record<string, number> = {};
    let total = 0;
    for (const item of items) {
      const meta = TRIP_ITEMS[item?.key];
      const amountCents = item?.amountCents;
      if (!meta || typeof amountCents !== "number" || !Number.isFinite(amountCents) || amountCents < 1) {
        return NextResponse.json({ error: "Invalid item" }, { status: 400 });
      }
      const cents = Math.round(amountCents);
      total += cents;
      breakdown[item.key] = (breakdown[item.key] ?? 0) + cents;
      lineItems.push({ name: meta.name, description: meta.description, amountCents: cents, quantity: 1 });
    }

    if (total < 100) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const feeCents = Math.round((total + 30) / (1 - 0.029)) - total;
    lineItems.push({
      name: "Processing fee",
      description: "so 100% of your gift is received",
      amountCents: feeCents,
      quantity: 1,
    });

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
      lineItems,
    });

    return NextResponse.json({ clientSecret });
  } catch (error) {
    console.error("Contribution checkout error:", error);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
