import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "../../shared/stripe-utils";
import {
  getProduct,
  requiresShipping,
  hasDigitalAssets,
  getDownloadableAssets,
} from "../../shared/products";
import fs from "fs";
import path from "path";

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;

  try {
    if (!endpointSecret) {
      console.error("Stripe webhook secret not found");
      return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
    }

    event = stripe.webhooks.constructEvent(payload, sig!, endpointSecret);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Webhook signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "payment_intent.succeeded":
      break;
    case "charge.refunded":
      await handleRefund(event.data.object as Stripe.Charge);
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;
  if (!metadata) return;

  const productId = metadata.productId;
  const productType = metadata.productType;

  console.log(`[Webhook] Checkout completed - Product: ${productId}, Type: ${productType}`);

  if (metadata.type === "project_funding" || productType === "funding") {
    await updateProjectFunding(session);
    return;
  }

  const product = productId ? getProduct(productId) : null;

  if (product) {
    if (requiresShipping(product)) {
      await handlePhysicalOrder(session, product);
    }

    if (hasDigitalAssets(productId!)) {
      await handleDigitalFulfillment(session, product);
    }
  } else {
    if (metadata.trackId) {
      await handleLegacyTrackPurchase(session);
    }
  }
}

async function handlePhysicalOrder(
  session: Stripe.Checkout.Session,
  product: ReturnType<typeof getProduct>
) {
  if (!product) return;

  const metadata = session.metadata;
  const shipping = session.customer_details;

  console.log(`[Physical Order] ${product.name}`);
  console.log(`  Size: ${metadata?.size}, Color: ${metadata?.color}`);
  console.log(`  Customer: ${shipping?.name}`);
  console.log(`  Email: ${shipping?.email}`);
}

async function handleDigitalFulfillment(
  session: Stripe.Checkout.Session,
  product: ReturnType<typeof getProduct>
) {
  if (!product) return;

  const assets = getDownloadableAssets(product);

  console.log(`[Digital Fulfillment] ${product.name}`);
  console.log(`  Assets: ${assets.join(", ")}`);
  console.log(`  Download link valid for 24 hours`);
}

async function handleLegacyTrackPurchase(session: Stripe.Checkout.Session) {
  const metadata = session.metadata;
  if (!metadata) return;

  console.log(`[Single Track] ${metadata.trackTitle}`);
  console.log(`  Mode: ${metadata.mode}`);
  console.log(`  Track ID: ${metadata.trackId}`);
}

async function updateProjectFunding(session: Stripe.Checkout.Session) {
  try {
    const metadata = session.metadata;
    if (!metadata?.projectId) return;

    const { projectId } = metadata;
    const amountCents = session.amount_total || 0;

    const projectsPath = path.join(process.cwd(), "data", "projects.json");
    const projectsData = JSON.parse(fs.readFileSync(projectsPath, "utf8"));

    if (projectsData[projectId]) {
      projectsData[projectId].raisedCents += amountCents;
      projectsData[projectId].backers += 1;

      fs.writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));

      console.log(
        `[Project Funding] ${projectId}: +$${amountCents / 100} (total: $${
          projectsData[projectId].raisedCents / 100
        })`
      );
    }
  } catch (error) {
    console.error("Error updating project funding:", error);
  }
}

async function handleRefund(charge: Stripe.Charge) {
  console.log(`[Refund] Charge ${charge.id} refunded`);
}
