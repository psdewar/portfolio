import { redirect } from "next/navigation";
import { Metadata } from "next";
import { stripe } from "../api/shared/stripe-utils";
import { getProduct, getDownloadableAssets, hasDigitalAssets } from "../api/shared/products";
import { getPurchaseBySessionId } from "../../lib/supabase-admin";
import { DownloadClient } from "./DownloadClient";

export const metadata: Metadata = {
  title: "Download",
  description: "Download your music files.",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function DownloadPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const sessionId = resolvedParams.session_id;

  if (!sessionId) {
    redirect("/listen");
  }

  // Dev bypass
  if (process.env.NODE_ENV === "development" && sessionId.startsWith("test_")) {
    return (
      <DownloadClient
        sessionId={sessionId}
        productName="Singles & 16s (2025)"
        customerEmail="test@example.com"
        assets={["singles-and-16s-2025"]}
        imageUrl="/images/merch/thank-you-download.jpg"
      />
    );
  }

  // In-person (Terminal) payments use PaymentIntent IDs
  if (sessionId.startsWith("pi_")) {
    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(sessionId);
    } catch (error) {
      console.error("Failed to retrieve payment intent:", error);
      redirect("/listen");
    }

    if (pi.status !== "succeeded") {
      redirect("/listen");
    }

    const productId = pi.metadata?.productId;
    const product = productId ? getProduct(productId) : null;
    const assets = product ? getDownloadableAssets(product) : [];
    const imageUrl = product?.images?.[0] || "";

    if (assets.length === 0) {
      redirect("/listen");
    }

    return (
      <DownloadClient
        sessionId={sessionId}
        productName={product?.name || "Your purchase"}
        customerEmail={pi.metadata?.email || ""}
        assets={assets}
        imageUrl={imageUrl}
      />
    );
  }

  // Online payments use Checkout Session IDs
  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["line_items"],
    });
  } catch (error) {
    console.error("Failed to retrieve session:", error);
    redirect("/listen");
  }

  if (session.payment_status !== "paid") {
    redirect("/listen");
  }

  const productId = session.metadata?.productId;
  const product = productId ? getProduct(productId) : null;
  const hasDigital = productId ? hasDigitalAssets(productId) : false;
  const assets = product ? getDownloadableAssets(product) : [];
  const customerEmail = session.customer_details?.email || "";
  const imageUrl = product?.images?.[0] || "";

  if (!hasDigital || assets.length === 0) {
    redirect("/listen");
  }

  return (
    <DownloadClient
      sessionId={sessionId}
      productName={product?.name || "Your purchase"}
      customerEmail={customerEmail}
      assets={assets}
      imageUrl={imageUrl}
    />
  );
}
