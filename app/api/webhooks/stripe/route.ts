import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";
import { stripe } from "../../shared/stripe-utils";
import {
  getProduct,
  requiresShipping,
  hasDigitalAssets,
  getDownloadableAssets,
  isTestMode,
} from "../../shared/products";
import { savePurchase, isKeepalive, decrementInventory, markEmailSent } from "../../../../lib/supabase-admin";
import { sendDownloadEmail } from "../../../../lib/sendgrid";
import PostHogClient from "../../../../lib/posthog";

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

  const testMode = isTestMode();
  if (testMode) {
    console.log(`[Webhook] TEST MODE - Event: ${event.type}`);
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionChange(event.data.object as Stripe.Subscription);
      break;
    case "customer.subscription.deleted":
      await handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
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

  // Ignore keepalive pings
  if (isKeepalive(productId) || isKeepalive(session.id)) {
    return;
  }

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

  // Decrement inventory in Supabase
  if (metadata?.size && metadata?.color) {
    const sku = `${metadata.color.toLowerCase()}-${metadata.size.toLowerCase()}`;
    await decrementInventory(sku);
  }
}

async function handleDigitalFulfillment(
  session: Stripe.Checkout.Session,
  product: ReturnType<typeof getProduct>
) {
  if (!product) return;

  const assets = getDownloadableAssets(product);
  const email = session.customer_details?.email;
  const testMode = isTestMode();

  if (testMode) {
    console.log("[Webhook] TEST MODE - Digital fulfillment:", {
      sessionId: session.id,
      email,
      productId: product.id,
      assets,
    });
  }

  if (email) {
    // Save purchase to database
    await savePurchase({
      sessionId: session.id,
      email,
      productId: product.id,
      productName: product.name,
      downloadableAssets: assets,
      amountCents: session.amount_total || undefined,
      paymentStatus: "paid",
    });

    // Send download email automatically
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://peytspencer.com";
    const downloadUrl = `${baseUrl}/download?session_id=${session.id}`;

    if (testMode) {
      console.log("[Webhook] TEST MODE - Would send email:", {
        to: email,
        productName: product.name,
        downloadUrl,
      });
    }

    const emailSent = await sendDownloadEmail({
      to: email,
      productName: product.name,
      downloadUrl,
    });

    if (emailSent) {
      await markEmailSent(session.id);
      console.log(`[Webhook] Download email sent to ${email} for ${product.name}`);
    } else {
      console.error(`[Webhook] Failed to send download email to ${email}`);
    }
  }
}

async function handleLegacyTrackPurchase(session: Stripe.Checkout.Session) {
  // Legacy single track purchase - no action needed
}

async function updateProjectFunding(session: Stripe.Checkout.Session) {
  try {
    const metadata = session.metadata;
    if (!metadata?.projectId) return;

    const { projectId } = metadata;

    // Track live stream tips in PostHog
    if (projectId === "live-stream") {
      const posthog = PostHogClient();
      const distinctId = session.customer_details?.email || session.id;
      const amountCents = session.amount_total || 0;
      posthog.capture({
        distinctId,
        event: "tip_completed",
        properties: {
          amount: amountCents / 100,
          source: "live-stream",
        },
      });
      await posthog.shutdown();
      return; // Live stream tips don't need project funding update
    }

    // Trigger ISR rebuild so page shows updated stats
    revalidatePath(`/fund/${projectId}`);
  } catch (error) {
    console.error("Error updating project funding:", error);
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription) {
  try {
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;
    const status = subscription.status;

    // Log subscription changes for now
    // Future: Update patron status in database
    console.log(`Subscription ${subscription.id} for customer ${customerId}: ${status}`);

    // Track in PostHog
    const posthog = PostHogClient();
    posthog.capture({
      distinctId: customerId,
      event: "subscription_updated",
      properties: {
        subscription_id: subscription.id,
        status,
        plan_amount: subscription.items.data[0]?.price?.unit_amount,
        plan_interval: subscription.items.data[0]?.price?.recurring?.interval,
      },
    });
    await posthog.shutdown();
  } catch (error) {
    console.error("Error handling subscription change:", error);
  }
}

async function handleSubscriptionCancelled(subscription: Stripe.Subscription) {
  try {
    const customerId = typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

    console.log(`Subscription ${subscription.id} cancelled for customer ${customerId}`);

    // Track in PostHog
    const posthog = PostHogClient();
    posthog.capture({
      distinctId: customerId,
      event: "subscription_cancelled",
      properties: {
        subscription_id: subscription.id,
        canceled_at: subscription.canceled_at,
      },
    });
    await posthog.shutdown();

    // Future: Revoke patron status in database
    // For now, patron cookie will eventually expire
  } catch (error) {
    console.error("Error handling subscription cancellation:", error);
  }
}

async function handleRefund(charge: Stripe.Charge) {
  try {
    // Look up the original session to get projectId
    const paymentIntentId =
      typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;

    if (!paymentIntentId) return;

    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 1,
    });

    const projectId = sessions.data[0]?.metadata?.projectId;
    if (!projectId || projectId === "live-stream") return;

    // Trigger ISR rebuild so page shows updated stats
    revalidatePath(`/fund/${projectId}`);
  } catch (error) {
    console.error("Error handling refund:", error);
  }
}
