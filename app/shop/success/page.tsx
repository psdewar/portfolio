import { redirect } from "next/navigation";
import { Metadata } from "next";
import { stripe } from "../../api/shared/stripe-utils";
import { getProduct, getDownloadableAssets, hasDigitalAssets } from "../../api/shared/products";
import { getPurchaseBySessionId } from "../../../lib/supabase-admin";
import { SuccessClient } from "./SuccessClient";

export const metadata: Metadata = {
  title: "Order Complete",
  description: "Thank you for your purchase. Download your files or check your email.",
  robots: { index: false, follow: false }, // Don't index success pages
};

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function ShopSuccessPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const sessionId = resolvedParams.session_id;

  if (!sessionId) {
    redirect("/shop");
  }

  // Fetch session from Stripe
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
  } catch (error) {
    console.error("Failed to retrieve session:", error);
    redirect("/shop");
  }

  // Verify payment
  if (session.payment_status !== "paid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950 text-white p-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Payment Pending</h1>
          <p className="text-neutral-400">Your payment is still being processed.</p>
        </div>
      </div>
    );
  }

  // Get product info from metadata
  const productId = session.metadata?.productId;
  const product = productId ? getProduct(productId) : null;
  const hasDigital = productId ? hasDigitalAssets(productId) : false;
  const assets = product ? getDownloadableAssets(product) : [];
  const customerEmail = session.customer_details?.email || "";

  // Check if email was already sent (by webhook)
  const purchase = await getPurchaseBySessionId(sessionId);
  const emailAlreadySent = purchase?.email_sent ?? false;

  return (
    <SuccessClient
      sessionId={sessionId}
      productName={product?.name || "Your purchase"}
      customerEmail={customerEmail}
      hasDigital={hasDigital}
      assets={assets}
      emailAlreadySent={emailAlreadySent}
    />
  );
}
