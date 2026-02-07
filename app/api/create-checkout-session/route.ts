import { NextRequest, NextResponse } from "next/server";
import { createCheckout, type LineItem } from "../../../lib/tiger";
import {
  getProduct,
  requiresShipping,
  getShippingConfig,
  getAllowedCountries,
  getDownloadableAssets,
  getSellableType,
  shouldCollectPhone,
  type Product,
} from "../shared/products";
import { checkRateLimit, getClientIP } from "../shared/rate-limit";
import {
  getBaseUrl,
  sanitizeInput,
  createBaseMetadata,
} from "../shared/stripe-utils";

function buildLineItem(
  product: Product,
  amount: number,
  metadata?: Record<string, string>,
): LineItem {
  let description = product.description;
  if (metadata?.size || metadata?.color) {
    description = `${metadata.size || "Medium"} ${(
      metadata.color || "black"
    ).toLowerCase()} ${description}`;
  }

  return {
    name: product.name,
    amountCents: amount,
    description,
    images: product.images,
    quantity: 1,
  };
}

function buildSessionMetadata(
  product: Product,
  amount: number,
  ip: string,
  customMetadata?: Record<string, string>,
): Record<string, string> {
  let sellableId = product.id;
  if (customMetadata?.size || customMetadata?.color) {
    const size = (customMetadata.size || "m").toLowerCase();
    const color = (customMetadata.color || "black").toLowerCase();
    sellableId = `${sellableId}-${color}-${size}`;
  }

  const sellableType = getSellableType(product);

  const base: Record<string, string> = {
    ...createBaseMetadata(ip),
    sellableType,
    sellableId,
    netAmount: String(amount),
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
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const {
      productId,
      amount,
      metadata,
      successPath: customSuccessPath,
      cancelPath: customCancelPath,
      skipShipping,
      customerEmail,
    } = body;

    console.log("[Checkout] Product:", productId, "amount:", amount, "successPath:", customSuccessPath, "cancelPath:", customCancelPath);

    if (!productId) {
      return NextResponse.json(
        { error: "Missing required field: productId" },
        { status: 400 },
      );
    }

    const product = getProduct(productId);
    if (!product) {
      return NextResponse.json(
        { error: `Unknown product: ${productId}` },
        { status: 400 },
      );
    }

    const finalAmount = amount || product.basePriceCents;
    if (typeof finalAmount !== "number" || finalAmount < 50) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    if (product.type === "donation" && finalAmount < product.minAmountCents) {
      return NextResponse.json(
        {
          error: `Minimum amount is $${(product.minAmountCents / 100).toFixed(2)}`,
        },
        { status: 400 },
      );
    }

    const baseUrl = getBaseUrl(request);

    // Validate successPath to prevent open redirects
    const safeSuccessPath =
      customSuccessPath?.startsWith("/") && !customSuccessPath.startsWith("//")
        ? customSuccessPath
        : product.successPath;
    const separator = safeSuccessPath.includes("?") ? "&" : "?";

    // Validate cancelPath to prevent open redirects
    const safeCancelPath =
      customCancelPath?.startsWith("/") && !customCancelPath.startsWith("//")
        ? customCancelPath
        : product.cancelPath;

    // Build Tiger request
    const tigerRequest: Parameters<typeof createCheckout>[0] = {
      mode: "payment",
      successUrl: `${baseUrl}${safeSuccessPath}${separator}session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}${safeCancelPath}`,
      metadata: buildSessionMetadata(product, finalAmount, ip, metadata),
      ...(customerEmail && { customerEmail }),
    };

    // Use priceId if available (Phase 2), otherwise use lineItems
    if (product.stripePriceId) {
      tigerRequest.priceId = product.stripePriceId;
    } else {
      tigerRequest.lineItems = [buildLineItem(product, finalAmount, metadata)];
    }

    // Shipping
    if (requiresShipping(product) && !skipShipping) {
      const countries = getAllowedCountries(product);
      const shippingConfig = getShippingConfig(product);

      tigerRequest.shipping = {
        allowedCountries: countries,
      };

      if (shippingConfig && typeof shippingConfig !== "string") {
        tigerRequest.shipping.options = [shippingConfig];
      }
    }

    // Phone collection
    if (shouldCollectPhone(product) && !skipShipping) {
      tigerRequest.collectPhone = true;
    }

    const { sessionId, url } = await createCheckout(tigerRequest);
    console.log("[Checkout] Session created:", { sessionId, url });
    return NextResponse.json({ sessionId, url });
  } catch (error) {
    console.error("Checkout session creation error:", error);
    return NextResponse.json(
      { error: "Failed to create payment session" },
      { status: 500 },
    );
  }
}
