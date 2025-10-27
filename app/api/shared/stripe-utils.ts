import Stripe from "stripe";
import { getSecureEnv } from "../../../lib/env-validation";

// Shared Stripe instance
export const stripe = new Stripe(getSecureEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2025-08-27.basil",
});

// Common base URL helper
export const getBaseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// Standard session expiry (30 minutes)
export const getSessionExpiry = () => Math.floor(Date.now() / 1000) + 30 * 60;

// Common session metadata
export const createBaseMetadata = (ip: string) => ({
  ip,
  timestamp: new Date().toISOString(),
});
