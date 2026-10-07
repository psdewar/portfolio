import { cache } from "react";
import { getUpcomingShows } from "../lib/shows";
import { chorusRead } from "../lib/chorus";
import { SEED_LEGS, posterLineFor, type Leg, type PosterLineShow } from "./legs-shared";

export * from "./legs-shared";

export async function posterLineForShow(
  show: PosterLineShow,
): Promise<string | null> {
  return show.leg
    ? posterLineFor(await getLegs(), show)
    : (show.posterLine ?? null);
}

export async function withPosterLines<T extends PosterLineShow>(
  shows: T[],
): Promise<(T & { posterLine: string | null })[]> {
  const legs = await getLegs();
  return shows.map((s) => ({ ...s, posterLine: posterLineFor(legs, s) }));
}

export const getLegs = cache(async (): Promise<Leg[]> => {
  try {
    const res = await chorusRead("legs");
    if (!res.ok) return Object.values(SEED_LEGS);
    const data = (await res.json()) as Leg[];
    const bySlug = new Map<string, Leg>(Object.entries(SEED_LEGS));
    for (const leg of Array.isArray(data) ? data : [])
      bySlug.set(leg.slug, leg);
    return [...bySlug.values()];
  } catch {
    return Object.values(SEED_LEGS);
  }
});

export async function getLeg(slug: string): Promise<Leg | undefined> {
  const legs = await getLegs();
  return legs.find((l) => l.slug === slug);
}

// The leg the funding currently points at: the next upcoming show on a
// fund-faceted leg wins, else the newest fund leg still raising (no settled
// previous trip; chorus appends, so last wins), else the first fund-faceted leg.
export async function getFundingLegSlug(): Promise<string | undefined> {
  const [legs, shows] = await Promise.all([getLegs(), getUpcomingShows()]);
  const fundable = new Set(legs.filter((l) => l.fund).map((l) => l.slug));
  const next = shows.find((s) => s.leg && fundable.has(s.leg));
  return (
    next?.leg ??
    [...legs].reverse().find((l) => l.fund && !l.fund.previousTrips?.length)
      ?.slug ??
    legs.find((l) => l.fund)?.slug
  );
}
