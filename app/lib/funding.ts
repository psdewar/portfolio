import Stripe from "stripe";
import { getSecureEnv } from "../../lib/env-validation";

const CACHE_TTL = 60_000;

interface CacheEntry {
  raisedCents: number;
  backers: number;
  tierCounts: Record<string, number>;
  fetchedAt: number;
}

const cache: Record<string, CacheEntry> = {};

export function clearFundingCache(projectId?: string) {
  if (projectId) {
    delete cache[projectId];
  } else {
    Object.keys(cache).forEach((k) => delete cache[k]);
  }
}

function getStripe() {
  return new Stripe(getSecureEnv("STRIPE_SECRET_KEY"), { apiVersion: "2025-08-27.basil" });
}

export async function getFundingStats(
  projectId: string
): Promise<{ raisedCents: number; backers: number; tierCounts: Record<string, number> }> {
  const now = Date.now();
  const cached = cache[projectId];
  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return {
      raisedCents: cached.raisedCents,
      backers: cached.backers,
      tierCounts: cached.tierCounts,
    };
  }
  try {
    const stripe = getStripe();
    const sessions = await stripe.checkout.sessions.list({ limit: 100 });
    const relevant = sessions.data.filter(
      (s) => s.payment_status === "paid" && s.metadata && s.metadata.projectId === projectId
    );
    const raisedCents = relevant.reduce((sum, s) => sum + (s.amount_total ?? 0), 0);
    const backers = relevant.length;
    // Compute tier counts based on amount_total (in cents)
    const tierCounts: Record<string, number> = { "1000": 0, "2500": 0, "5000": 0, custom: 0 };
    for (const s of relevant) {
      const amt = s.amount_total ?? 0;
      if (amt === 1000 || amt === 2500 || amt === 5000) {
        tierCounts[String(amt)] = (tierCounts[String(amt)] || 0) + 1;
      } else {
        tierCounts.custom += 1;
      }
    }
    cache[projectId] = { raisedCents, backers, tierCounts, fetchedAt: now };
    return { raisedCents, backers, tierCounts };
  } catch (e) {
    console.error("Failed to fetch funding stats", e);
    return {
      raisedCents: 0,
      backers: 0,
      tierCounts: { "1000": 0, "2500": 0, "5000": 0, custom: 0 },
    };
  }
}
