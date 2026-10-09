export type FundLine = {
  key: string;
  label: string;
  note: string;
  amount: number;
};

export type FundBooked = {
  slug?: string;
  venue: string;
  city?: string;
  guestSet?: boolean;
  eventName?: string | null;
  place?: string;
  date?: string;
  doorTime?: string;
  private?: boolean;
  hostHref?: string;
};

export type FundRegion = { name: string; cities: string[]; months: string };

export type FundNote = { label: string; note: string };

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
  rsvpLabel?: string;
  tags?: string;
  venueImg?: string;
  venueImgWidth?: number;
  venueImgOffsetY?: number;
  centerLogo?: boolean;
  taglineAlign?: string;
  doorsOpen?: string;
  scale?: number;
  placeholders?: { date: string; label?: string }[];
  shows?: Record<
    string,
    { venueLabel?: string; dateLabel?: string; doorsOpen?: string }
  >;
};

// A leg is a trip grouping. Funding and the poster are facets; the ledger
// references the same slug, and shows point at a leg via Show.leg.
export type Leg = {
  slug: string;
  fund?: FundFacet;
  pamphlet?: PamphletFacet;
};

// Flat view consumed by TripFund: the fund facet plus the leg slug.
export type FundLeg = FundFacet & { slug: string };


// The five prime budget lines a new fund leg starts from. norcal is the
// canonical template; the artist edits these per trip and can drop any a trip
// does not need. Remove a line, or zero it, and it stays gone.
export const PRIME_LINES: readonly FundLine[] = [
  {
    key: "flight",
    label: "Flight",
    note: "round-trip, includes checked bags for my equipment",
    amount: 450,
  },
  {
    key: "car",
    label: "Rental car",
    note: "includes gas, tolls, and parking",
    amount: 550,
  },
  { key: "lodging", label: "Lodging", note: "hotel or Airbnb", amount: 900 },
  {
    key: "food",
    label: "Food",
    note: "breakfast, lunch, and dinner on the road",
    amount: 350,
  },
  {
    key: "buffer",
    label: "Just in case",
    note: "life happens, like cancellations out of my control",
    amount: 250,
  },
];

// Fresh copies of the template lines, for seeding a new fund leg.
export function primeLines(): FundLine[] {
  return PRIME_LINES.map((p) => ({ ...p }));
}

// Built-in seed so /fund keeps working before chorus is seeded. Chorus wins
// once it returns a leg with the same slug.
export const SEED_LEGS: Record<string, Leg> = {
  norcal: {
    slug: "norcal",
    fund: {
      destination: "Northern California",
      shortName: "NorCal",
      nights: 6,
      lines: primeLines(),
    },
  },
};

export function toFundView(leg: Leg | undefined): FundLeg | undefined {
  return leg?.fund ? { ...leg.fund, slug: leg.slug } : undefined;
}

export type PosterLineShow = {
  slug: string;
  leg?: string | null;
  posterLine?: string | null;
  hideHost?: boolean | null;
};

export function posterLineFor(
  legs: Leg[],
  show: PosterLineShow,
): string | null {
  if (show.hideHost) return null;
  return (
    legs.find((l) => l.slug === show.leg)?.pamphlet?.shows?.[show.slug]
      ?.venueLabel ??
    show.posterLine ??
    null
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
