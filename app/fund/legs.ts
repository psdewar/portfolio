import { getUpcomingShows } from "../lib/shows";

export type FundLine = { key: string; label: string; note: string; amount: number };

export type FundBooked = {
  slug?: string;
  venue: string;
  eventName?: string | null;
  place?: string;
  date?: string;
  doorTime?: string;
  private?: boolean;
};

// A completed earlier trip on the same fund page: shown as a settled budget
// below the current ask, not as a second ask.
export type FundTrip = {
  label: string;
  note?: string;
  lines: FundLine[];
  coveredInKind?: string[];
};

// The funding facet of a leg: the campaign rendered at /fund/<slug>.
export type FundFacet = {
  destination: string;
  shortName: string;
  nights: number;
  flightBy?: string;
  lines: FundLine[];
  coveredInKind?: string[];
  booked?: FundBooked[];
  previousTrips?: FundTrip[];
};

// The pamphlet (poster) facet of a leg. Its shows derive from Show.leg; the
// `shows` map is the print overlay — keys are the included shows, values their
// per-show label overrides.
export type PamphletFacet = {
  label?: string;
  showDoors?: boolean;
  showQr?: boolean;
  pinTopRsvp?: boolean;
  tags?: string;
  venueImg?: string;
  venueImgWidth?: number;
  venueImgOffsetY?: number;
  centerLogo?: boolean;
  taglineAlign?: string;
  doorsOpen?: string;
  scale?: number;
  shows?: Record<string, { venueLabel?: string; dateLabel?: string; doorsOpen?: string }>;
};

// A leg is a trip grouping. Funding and the poster are facets; the ledger
// references the same slug, and shows point at a leg via Show.leg.
export type Leg = {
  slug: string;
  fund?: FundFacet;
  pamphlet?: PamphletFacet;
};

// Flat view consumed by FundFunnel: the fund facet plus the leg slug.
export type FundLeg = FundFacet & { slug: string };

const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";

// The five prime budget lines a new fund leg starts from. norcal is the
// canonical template; the artist edits these per trip and can drop any a trip
// does not need. Remove a line, or zero it, and it stays gone.
export const PRIME_LINES: readonly FundLine[] = [
  { key: "flight", label: "Flight", note: "round-trip, includes checked bags for my equipment", amount: 450 },
  { key: "car", label: "Rental car", note: "includes gas, tolls, and parking", amount: 550 },
  { key: "lodging", label: "Lodging", note: "hotel or Airbnb", amount: 900 },
  { key: "food", label: "Food", note: "breakfast, lunch, and dinner on the road", amount: 350 },
  { key: "buffer", label: "Just in case", note: "life happens, like cancellations out of my control", amount: 250 },
];

// Fresh copies of the template lines, for seeding a new fund leg.
export function primeLines(): FundLine[] {
  return PRIME_LINES.map((p) => ({ ...p }));
}

// Built-in seed so /fund keeps working before chorus is seeded. Chorus wins
// once it returns a leg with the same slug.
const SEED_LEGS: Record<string, Leg> = {
  norcal: {
    slug: "norcal",
    fund: {
      destination: "the Bay & Sactown",
      shortName: "Bay and Sactown",
      nights: 6,
      lines: primeLines(),
    },
  },
};

export function toFundView(leg: Leg | undefined): FundLeg | undefined {
  return leg?.fund ? { ...leg.fund, slug: leg.slug } : undefined;
}

export function posterLineFor(legs: Leg[], show: { slug: string; leg?: string | null }): string | null {
  return legs.find((l) => l.slug === show.leg)?.pamphlet?.shows?.[show.slug]?.venueLabel ?? null;
}

export async function withPosterLines<T extends { slug: string; leg?: string | null }>(
  shows: T[],
): Promise<(T & { posterLine: string | null })[]> {
  const legs = await getLegs();
  return shows.map((s) => ({ ...s, posterLine: posterLineFor(legs, s) }));
}

export async function getLegs(): Promise<Leg[]> {
  try {
    const res = await fetch(`${SHOWS_API}/chorus/legs`, { cache: "no-store" });
    if (!res.ok) return Object.values(SEED_LEGS);
    const data = (await res.json()) as Leg[];
    const bySlug = new Map<string, Leg>(Object.entries(SEED_LEGS));
    for (const leg of Array.isArray(data) ? data : []) bySlug.set(leg.slug, leg);
    return [...bySlug.values()];
  } catch {
    return Object.values(SEED_LEGS);
  }
}

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
    [...legs].reverse().find((l) => l.fund && !l.fund.previousTrips?.length)?.slug ??
    legs.find((l) => l.fund)?.slug
  );
}

// Back-compat: seed-only sync map used by the /fund redirect and SSG params.
// New surfaces use getLeg/getLegs (chorus-backed).
export const FUND_LEGS: Record<string, FundLeg> = Object.fromEntries(
  Object.values(SEED_LEGS)
    .map(toFundView)
    .filter((v): v is FundLeg => Boolean(v))
    .map((v) => [v.slug, v]),
);
