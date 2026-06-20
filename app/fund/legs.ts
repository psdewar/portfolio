export type FundLine = { key: string; label: string; note: string; amount: number };

export type FundBooked = { slug?: string; venue: string; date?: string; doorTime?: string };

// The funding facet of a leg: the campaign rendered at /fund/<slug>.
export type FundFacet = {
  destination: string;
  shortName: string;
  nights: number;
  lines: FundLine[];
  coveredInKind?: string[];
  booked?: FundBooked[];
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

// Built-in seed so /fund keeps working before chorus is seeded. Chorus wins
// once it returns a leg with the same slug.
const SEED_LEGS: Record<string, Leg> = {
  norcal: {
    slug: "norcal",
    fund: {
      destination: "the Bay & Sactown",
      shortName: "Bay and Sactown",
      nights: 6,
      lines: [
        { key: "flight", label: "Flight", note: "round-trip, includes checked bags for equipment", amount: 450 },
        { key: "car", label: "Rental car", note: "includes gas, tolls, and parking", amount: 550 },
        { key: "lodging", label: "Lodging", note: "hotel or Airbnb", amount: 900 },
        { key: "food", label: "Food", note: "breakfast, lunch, and dinner on the road", amount: 350 },
        { key: "buffer", label: "Just in case", note: "life happens, like cancellations out of my control", amount: 250 },
      ],
    },
  },
};

export function toFundView(leg: Leg | undefined): FundLeg | undefined {
  return leg?.fund ? { ...leg.fund, slug: leg.slug } : undefined;
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

// Back-compat: seed-only sync map used by the /fund redirect and SSG params.
// New surfaces use getLeg/getLegs (chorus-backed).
export const FUND_LEGS: Record<string, FundLeg> = Object.fromEntries(
  Object.values(SEED_LEGS)
    .map(toFundView)
    .filter((v): v is FundLeg => Boolean(v))
    .map((v) => [v.slug, v]),
);
