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

type TierKey = "2500" | "5000" | "10000" | "custom";
type Offsets = {
  raisedCents?: number;
  backers?: number;
  tierCounts?: Partial<Record<TierKey, number>>;
};
// TODO: figure out how to get refund data from API before removing
const manualOffsets: Record<string, Offsets> = {
  "flight-to-boise": { raisedCents: -5000, backers: -1, tierCounts: { "5000": -1 } },
};

export function setFundingOffsets(projectId: string, offsets: Offsets) {
  manualOffsets[projectId] = { ...(manualOffsets[projectId] ?? {}), ...offsets };
}

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

function applyOffsets(
  projectId: string,
  stats: { raisedCents: number; backers: number; tierCounts: Record<TierKey, number> }
) {
  const off = manualOffsets[projectId];
  if (!off) return stats;

  const tierCounts: Record<TierKey, number> = { ...stats.tierCounts };

  if (off.tierCounts) {
    for (const key of Object.keys(off.tierCounts) as TierKey[]) {
      const delta = off.tierCounts[key] ?? 0;
      tierCounts[key] = Math.max(0, (tierCounts[key] ?? 0) + delta);
    }
  }

  return {
    raisedCents: Math.max(0, stats.raisedCents + (off.raisedCents ?? 0)),
    backers: Math.max(0, stats.backers + (off.backers ?? 0)),
    tierCounts,
  };
}

/**
 * Fetch campaign totals by projectId and then apply manual offsets.
 * NOTE: This version keeps your original logic (no refund math),
 * and relies on the manual offsets for corrections.
 */
export async function getFundingStats(
  projectId: string
): Promise<{ raisedCents: number; backers: number; tierCounts: Record<TierKey, number> }> {
  const now = Date.now();
  const cached = cache[projectId];

  if (cached && now - cached.fetchedAt < CACHE_TTL) {
    return applyOffsets(projectId, {
      raisedCents: cached.raisedCents,
      backers: cached.backers,
      tierCounts: cached.tierCounts as Record<TierKey, number>,
    });
  }

  try {
    const stripe = getStripe();

    const sessions = await stripe.checkout.sessions.list({ limit: 100 });

    const relevant = sessions.data.filter(
      (s) => s.payment_status === "paid" && s.metadata && s.metadata.projectId === projectId
    );

    const raisedCents = relevant.reduce((sum, s) => sum + (s.amount_total ?? 0), 0);
    const backers = relevant.length;

    const tierCounts: Record<TierKey, number> = {
      "2500": 0,
      "5000": 0,
      "10000": 0,
      custom: 0,
    };
    for (const s of relevant) {
      const amt = s.amount_total ?? 0;
      if (amt === 2500 || amt === 5000 || amt === 10000) {
        tierCounts[String(amt) as TierKey] = (tierCounts[String(amt) as TierKey] || 0) + 1;
      } else {
        tierCounts.custom += 1;
      }
    }

    cache[projectId] = { raisedCents, backers, tierCounts, fetchedAt: now };

    return applyOffsets(projectId, { raisedCents, backers, tierCounts });
  } catch (e) {
    console.error("Failed to fetch funding stats", e);
    const zero = { "2500": 0, "5000": 0, "10000": 0, custom: 0 } as Record<TierKey, number>;
    return applyOffsets(projectId, { raisedCents: 0, backers: 0, tierCounts: zero });
  }
}
