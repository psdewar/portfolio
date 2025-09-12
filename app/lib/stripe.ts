import { loadStripe } from "@stripe/stripe-js";

// Replace with your publishable key
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
  if (process.env.NODE_ENV === 'development') {
    console.warn("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY not found in environment variables");
  }
}

export const stripePromise = loadStripe(stripePublishableKey || "");

export const STRIPE_CONFIG = {
  suggestedAmounts: [
    { amount: 99, tier: "This Slaps" },
    { amount: 299, tier: "Run It Back" },
    { amount: 499, tier: "Stuck In My Head" },
    { amount: 999, tier: "Encore" },
  ], // $1, $3, $5, $10
  minimumAmount: 99, // $0.99 minimum
  currency: "usd",
};
