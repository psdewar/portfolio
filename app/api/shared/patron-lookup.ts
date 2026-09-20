import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "./stripe-utils";
import { tierForMonthlyNet, type PatronTierName } from "../../data/patron-config";
import { stripeFeeCents } from "../../lib/fees";

export function tierFromPrice(price: Stripe.Price | null | undefined): PatronTierName | null {
  if (!price || !price.unit_amount) return null;
  const periodNet = (price.unit_amount - stripeFeeCents(price.unit_amount)) / 100;
  const net = periodNet / (price.recurring?.interval === "year" ? 10 : 1);
  return tierForMonthlyNet(net);
}

const PATRON_PROJECT_IDS = new Set(["monthly-support", "annual-support"]);

export function isPatronSession(session: Stripe.Checkout.Session): boolean {
  return session.mode === "subscription" || PATRON_PROJECT_IDS.has(session.metadata?.projectId ?? "");
}

export function tierFromSession(session: Stripe.Checkout.Session): PatronTierName | null {
  if (typeof session.subscription === "object" && session.subscription) {
    return tierFromPrice(session.subscription.items.data[0]?.price);
  }
  if (!isPatronSession(session) || !session.amount_total) return null;
  const periodNet = (session.amount_total - stripeFeeCents(session.amount_total)) / 100;
  const net = periodNet / (session.metadata?.projectId === "annual-support" ? 10 : 1);
  return tierForMonthlyNet(net);
}

export async function findActivePatron(
  email: string,
): Promise<{ email: string; tier: PatronTierName | null } | null> {
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

export function setPatronCookie(response: NextResponse): NextResponse {
  response.cookies.set("patronToken", "active", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}
