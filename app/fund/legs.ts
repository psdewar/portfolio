export type FundLine = { key: string; label: string; note: string; amount: number };

export type FundLeg = {
  slug: string;
  destination: string;
  shortName: string;
  nights: number;
  concerts: string;
  lines: FundLine[];
  coveredInKind?: string[];
};

export const FUND_LEGS: Record<string, FundLeg> = {
  norcal: {
    slug: "norcal",
    destination: "the Bay & Sactown",
    shortName: "Bay and Sactown",
    nights: 6,
    concerts: "4-5",
    lines: [
      { key: "flight", label: "Flight", note: "round-trip, includes checked bags for equipment", amount: 450 },
      { key: "car", label: "Rental car", note: "includes gas, tolls, and parking", amount: 550 },
      { key: "lodging", label: "Lodging", note: "hotel or Airbnb", amount: 900 },
      { key: "food", label: "Food", note: "breakfast, lunch, and dinner on the road", amount: 350 },
      { key: "buffer", label: "Just in case", note: "life happens, like cancellations out of my control", amount: 250 },
    ],
  },
};

export function getFundLeg(slug: string): FundLeg | undefined {
  return FUND_LEGS[slug];
}
