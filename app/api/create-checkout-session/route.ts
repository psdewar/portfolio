import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { sanitizeCheckoutData, logDevError, extractIpAddress } from "../shared/audio-utils";
import { stripe, getBaseUrl, getSessionExpiry, createBaseMetadata } from "../shared/stripe-utils";

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = extractIpAddress(request);

    // if (!checkCheckoutRateLimit(ip)) {
    //   return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    // }

    const body = await request.json();

    // Validate required fields
    const { amount, mode, currency, productId, trackId, trackTitle, metadata } = body;

    if (!amount || !mode || !currency) {
      return NextResponse.json(
        { error: "Missing required fields: amount, mode, currency" },
        { status: 400 }
      );
    }

    // Determine product type and build appropriate metadata
    const isProduct = !!productId;
    const isTrack = !!trackId && !!trackTitle;

    if (!isProduct && !isTrack) {
      return NextResponse.json(
        { error: "Must provide either productId or trackId+trackTitle" },
        { status: 400 }
      );
    }

    // Build line items based on product type
    let lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
    let sessionMetadata: Record<string, string>;
    let successUrl: string;
    let cancelUrl: string;

    if (isProduct) {
      // Merchandise purchase (using dynamic product creation)
      lineItems = [
        {
          price_data: {
            currency: currency as string,
            product_data: {
              name: "From The Archives: Exhibit PSD",
              description: `${metadata?.size || "Medium"} ${
                metadata?.color.toLowerCase() || "black"
              } 100% cotton t-shirt`,
              metadata: {
                productId,
                type: "merchandise",
              },
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ];
      sessionMetadata = {
        productId,
        mode,
        ...createBaseMetadata(ip),
        ...(metadata || {}), // Include size, color, etc.
      };
      successUrl = `${getBaseUrl()}/merch?success=true&session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${getBaseUrl()}/merch?canceled=true`;
    } else {
      // Track download (dynamic product)
      const checkoutData = sanitizeCheckoutData(body);
      if (!checkoutData) {
        return NextResponse.json({ error: "Invalid track data" }, { status: 400 });
      }

      lineItems = [
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
      ];
      sessionMetadata = {
        trackId,
        trackTitle,
        mode,
        ...createBaseMetadata(ip),
      };
      successUrl = `${getBaseUrl()}/music?success=true&session_id={CHECKOUT_SESSION_ID}`;
      cancelUrl = `${getBaseUrl()}/music?canceled=true`;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: sessionMetadata,
      expires_at: getSessionExpiry(),
      // Collect shipping address for merchandise purchases
      ...(isProduct && {
        shipping_address_collection: {
          allowed_countries: ["US"], // Add more countries as needed
        },
        phone_number_collection: {
          enabled: true,
        },
      }),
    });

    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    logDevError(error, "Stripe session creation error");
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
