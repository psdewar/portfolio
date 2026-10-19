import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "./stripe-utils";
import { tierForMonthlyNet, type SupporterTierName } from "../../data/supporter-config";
import { stripeFeeCents } from "../../lib/fees";
import { createSupporterToken, SUPPORTER_MAX_AGE } from "../../../lib/session";

export function tierFromPrice(price: Stripe.Price | null | undefined): SupporterTierName | null {
  if (!price || !price.unit_amount) return null;
  const periodNet = (price.unit_amount - stripeFeeCents(price.unit_amount)) / 100;
  const net = periodNet / (price.recurring?.interval === "year" ? 10 : 1);
  return tierForMonthlyNet(net);
}

const SUPPORTER_PROJECT_IDS = new Set(["monthly-support", "annual-support"]);

export function isSupporterSession(session: Stripe.Checkout.Session): boolean {
  return session.mode === "subscription" || SUPPORTER_PROJECT_IDS.has(session.metadata?.projectId ?? "");
}

export function supporterSessionIsCurrent(session: Stripe.Checkout.Session): boolean {
  if (typeof session.subscription === "object" && session.subscription) {
    return ["active", "trialing"].includes(session.subscription.status);
  }
  const days = session.metadata?.projectId === "annual-support" ? 366 : 31;
  return Date.now() / 1000 < session.created + days * 86400;
}

export function tierFromSession(session: Stripe.Checkout.Session): SupporterTierName | null {
  if (typeof session.subscription === "object" && session.subscription) {
    return tierFromPrice(session.subscription.items.data[0]?.price);
  }
  if (!isSupporterSession(session) || !session.amount_total) return null;
  const periodNet = (session.amount_total - stripeFeeCents(session.amount_total)) / 100;
  const net = periodNet / (session.metadata?.projectId === "annual-support" ? 10 : 1);
  return tierForMonthlyNet(net);
}

export async function findActiveSupporter(
  email: string,
): Promise<{ email: string; tier: SupporterTierName | null } | null> {
  const customers = await stripe.customers.list({ email: email.trim().toLowerCase(), limit: 1 });
  const customer = customers.data[0];
  if (!customer) return null;
  const subscriptions = await stripe.subscriptions.list({ customer: customer.id, status: "active", limit: 1 });
  if (subscriptions.data.length === 0) return null;
  return {
    email: customer.email || email.trim().toLowerCase(),
    tier: tierFromPrice(subscriptions.data[0].items.data[0]?.price),
  };
}

export function setSupporterCookie(response: NextResponse, email: string): NextResponse {
  response.cookies.set("supporterToken", createSupporterToken(email), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SUPPORTER_MAX_AGE,
  });
  return response;
}
