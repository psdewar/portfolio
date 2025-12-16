import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import {
  stripe,
  getBaseUrl,
  getSessionExpiry,
  createBaseMetadata,
  sanitizeInput,
} from "../shared/stripe-utils";
import {
  getProduct,
  requiresShipping,
  getShippingConfig,
  getAllowedCountries,
  getDownloadableAssets,
  getSellableType,
  getCurrency,
  shouldCollectPhone,
  type Product,
  type ShippingConfig,
} from "../shared/products";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";

function buildLineItems(
  product: Product,
  amount: number,
  baseUrl: string,
  metadata?: Record<string, string>
): Stripe.Checkout.SessionCreateParams.LineItem[] {
  // Use images directly (should be full HTTPS URLs in product config)
  const images = product.images || [];

  // Build sellable ID with size/color if provided
  let sellableId = product.id;
  if (metadata?.size || metadata?.color) {
    const size = (metadata.size || "m").toLowerCase();
    const color = (metadata.color || "black").toLowerCase();
    sellableId = `${sellableId}-${color}-${size}`;
  }

  const sellableType = getSellableType(product);

  // Phase 2: If stripePriceId exists, use preconfigured price
  if (product.stripePriceId) {
    return [{ price: product.stripePriceId, quantity: 1 }];
  }

  // Phase 1: Dynamic pricing via price_data
  if (product.type === "donation") {
    return [
      {
        price_data: {
          currency: getCurrency(product),
          product_data: {
            name: product.name,
            description: product.description,
            images,
            metadata: {
              sellableType,
              sellableId,
            },
          },
          unit_amount: amount,
        },
        quantity: 1,
      },
    ];
  }

  let description = product.description;
  if (metadata?.size || metadata?.color) {
    description = `${metadata.size || "Medium"} ${(
      metadata.color || "black"
    ).toLowerCase()} ${description}`;
  }

  return [
    {
      price_data: {
        currency: getCurrency(product),
        product_data: {
          name: product.name,
          description,
          images,
          metadata: {
            sellableType,
            sellableId,
          },
        },
        unit_amount: amount,
      },
      quantity: 1,
    },
  ];
}

function buildSessionMetadata(
  product: Product,
  amount: number,
  ip: string,
  customMetadata?: Record<string, string>
): Record<string, string> {
  // Build sellable ID with size/color if provided
  let sellableId = product.id;
  if (customMetadata?.size || customMetadata?.color) {
    const size = (customMetadata.size || "m").toLowerCase();
    const color = (customMetadata.color || "black").toLowerCase();
    sellableId = `${sellableId}-${color}-${size}`;
  }

  const sellableType = getSellableType(product);

  // Stable analytics metadata (the continuity layer)
  const base: Record<string, string> = {
    ...createBaseMetadata(ip),
    // Sellable identifiers (stable - never change these)
    sellableType,
    sellableId,
    netAmount: String(amount),
    // Product info (for reference)
    productId: product.id,
    productType: product.type,
    productName: product.name,
  };

  const assets = getDownloadableAssets(product);
  if (assets.length > 0) base.downloadableAssets = assets.join(",");

  if (customMetadata) {
    Object.entries(customMetadata).forEach(([key, value]) => {
      if (typeof value === "string") base[key] = sanitizeInput(value);
    });
  }

  return base;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIP(request);

    const rateCheck = checkRateLimit(ip, "checkout");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)) } }
      );
    }

    const body = await request.json();
    const { productId, amount, metadata } = body;

    if (!productId) {
      return NextResponse.json({ error: "Missing required field: productId" }, { status: 400 });
    }

    const product = getProduct(productId);
    if (!product) {
      return NextResponse.json({ error: `Unknown product: ${productId}` }, { status: 400 });
    }

    const finalAmount = amount || product.basePriceCents;
    if (typeof finalAmount !== "number" || finalAmount < 50) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (product.type === "donation" && finalAmount < product.minAmountCents) {
      return NextResponse.json(
        { error: `Minimum amount is $${(product.minAmountCents / 100).toFixed(2)}` },
        { status: 400 }
      );
    }

    const baseUrl = getBaseUrl();

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ["card"],
      line_items: buildLineItems(product, finalAmount, baseUrl, metadata),
      mode: "payment",
      success_url: `${baseUrl}${product.successPath}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${product.cancelPath}`,
      metadata: buildSessionMetadata(product, finalAmount, ip, metadata),
      expires_at: getSessionExpiry(),
    };

    if (requiresShipping(product)) {
      const countries = getAllowedCountries(
        product
      ) as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
      sessionParams.shipping_address_collection = { allowed_countries: countries };

      const shippingConfig = getShippingConfig(product);
      if (shippingConfig) {
        if (typeof shippingConfig === "string") {
          // Preconfigured shipping rate ID
          sessionParams.shipping_options = [{ shipping_rate: shippingConfig }];
        } else {
          // Inline shipping_rate_data
          const shippingRateData: Stripe.Checkout.SessionCreateParams.ShippingOption.ShippingRateData =
            {
              type: "fixed_amount",
              fixed_amount: {
                amount: shippingConfig.amountCents,
                currency: "usd",
              },
              display_name: shippingConfig.displayName,
            };
          if (shippingConfig.deliveryEstimate) {
            shippingRateData.delivery_estimate = {
              minimum: shippingConfig.deliveryEstimate.minimum,
              maximum: shippingConfig.deliveryEstimate.maximum,
            };
          }
          sessionParams.shipping_options = [{ shipping_rate_data: shippingRateData }];
        }
      }
    }

    // Collect phone if needed (derived: true when shipping required)
    if (shouldCollectPhone(product)) {
      sessionParams.phone_number_collection = { enabled: true };
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ sessionId: session.id });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json({ error: "Failed to create payment session" }, { status: 500 });
  }
}
