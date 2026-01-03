import Stripe from "stripe";
import { getSecureEnv } from "../../../lib/env-validation";
import {
  getProduct,
  hasDigitalAssets,
  getDownloadableAssets,
  type ProductConfig,
} from "./products";

export const stripe = new Stripe(getSecureEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-08-27.basil",
});

export const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;
export const getBaseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

export function createBaseMetadata(ip: string): Record<string, string> {
  return { ip, timestamp: new Date().toISOString() };
}

export function sanitizeInput(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().replace(/[<>"/\\&]/g, "");
}

export function validateAmount(amount: unknown): boolean {
  return typeof amount === "number" && amount >= 50 && amount <= 100000;
}

interface SessionVerificationResult {
  success: boolean;
  error?: string;
  status?: number;
  session?: Stripe.Checkout.Session;
  product?: ProductConfig;
}

export async function verifyDownloadSession(
  sessionId: string,
  trackId: string
): Promise<SessionVerificationResult> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return { success: false, error: "Payment not completed", status: 402 };
    }

    const productId = session.metadata?.productId;
    const product = productId ? getProduct(productId) : null;

    if (!product) return { success: false, error: "Invalid product", status: 400 };

    if (!productId || !hasDigitalAssets(productId)) {
      return {
        success: false,
        error: "Product does not include downloads",
        status: 403,
      };
    }

    const digitalAssets = getDownloadableAssets(product);
    if (!digitalAssets.includes(trackId)) {
      return {
        success: false,
        error: "Track not included in purchase",
        status: 403,
      };
    }

    const paymentTime = session.created * 1000;
    if (Date.now() > paymentTime + SESSION_EXPIRY_MS) {
      return { success: false, error: "Download link expired", status: 410 };
    }

    return { success: true, session, product };
  } catch (error) {
    console.error("Session verification error:", error);
    return {
      success: false,
      error: "Payment verification failed",
      status: 401,
    };
  }
}

export async function getTrackDownloadCount(sessionId: string, trackId: string): Promise<number> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const count = session.metadata?.[`downloads_${trackId}`];
    return count ? parseInt(count, 10) : 0;
  } catch {
    return 0;
  }
}

export async function incrementTrackDownloadCount(
  sessionId: string,
  trackId: string
): Promise<number> {
  const currentCount = await getTrackDownloadCount(sessionId, trackId);
  const newCount = currentCount + 1;
  await stripe.checkout.sessions.update(sessionId, {
    metadata: { [`downloads_${trackId}`]: String(newCount) },
  });
  return newCount;
}
