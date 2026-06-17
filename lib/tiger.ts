import "server-only";
import { createTigerClient } from "tiger-client";
import { getSecureEnv } from "./env-validation";

export type {
  CheckoutRequest,
  CheckoutResponse,
  SessionResponse,
  LineItem,
  ShippingOption,
} from "tiger-client";

const tiger = createTigerClient({
  appKey: getSecureEnv("TIGER_APP_KEY"),
  baseUrl: process.env.TIGER_BASE_URL,
});

export const createCheckout = tiger.checkout;
export const getSession = tiger.getSession;
