// Human-readable names for tour stops. Prefers a well-known regional
// colloquial (Tri-State, DMV, PNW, etc.) when the city fits one;
// otherwise falls back to the full state/province name.

// State/province code → full name (the fallback "warm" display).
const REGION_NAME: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas",
  CA: "California", CO: "Colorado", CT: "Connecticut", DE: "Delaware",
  DC: "DC", FL: "Florida", GA: "Georgia", HI: "Hawaii", ID: "Idaho",
  IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky",
  LA: "Louisiana", ME: "Maine", MD: "Maryland", MA: "Massachusetts",
  MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon",
  PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah",
  VT: "Vermont", VA: "Virginia", WA: "Washington", WV: "West Virginia",
  WI: "Wisconsin", WY: "Wyoming",
  BC: "British Columbia", AB: "Alberta", SK: "Saskatchewan",
  MB: "Manitoba", ON: "Ontario", QC: "Quebec", NB: "New Brunswick",
  NS: "Nova Scotia", PE: "PEI", NL: "Newfoundland",
  YT: "Yukon", NT: "Northwest Territories", NU: "Nunavut",
};

// City-level overrides — when a city sits inside a tighter, well-known
// regional identity. Key: "city-lowercase|REGION".
const CITY_COLLOQUIAL: Record<string, string> = {
  // NYC Tri-State
  "hoboken|NJ": "the Tri-State",
  "jersey city|NJ": "the Tri-State",
  "newark|NJ": "the Tri-State",
  "long branch|NJ": "the Tri-State",
  "stamford|CT": "the Tri-State",
  "norwalk|CT": "the Tri-State",
  "white plains|NY": "the Tri-State",
  "mount vernon|NY": "the Tri-State",
  "scarsdale|NY": "the Tri-State",
  // DC / DMV
  "fulton|MD": "the DMV",
  "bethesda|MD": "the DMV",
  "silver spring|MD": "the DMV",
  "arlington|VA": "the DMV",
  "alexandria|VA": "the DMV",
  "mclean|VA": "the DMV",
  // South Florida
  "miami|FL": "South Florida",
  "fort lauderdale|FL": "South Florida",
  "west palm beach|FL": "South Florida",
  "coral springs|FL": "South Florida",
  "boca raton|FL": "South Florida",
  "hollywood|FL": "South Florida",
  // Greater Vancouver / Lower Mainland
  "vancouver|BC": "the Lower Mainland",
  "richmond|BC": "the Lower Mainland",
  "burnaby|BC": "the Lower Mainland",
  "surrey|BC": "the Lower Mainland",
  "north vancouver|BC": "the Lower Mainland",
  // Bay Area
  "san francisco|CA": "the Bay Area",
  "oakland|CA": "the Bay Area",
  "san jose|CA": "the Bay Area",
  "berkeley|CA": "the Bay Area",
};

// Region-level colloquial fallbacks — used when no city override matches.
const REGION_COLLOQUIAL: Record<string, string> = {
  WA: "the PNW",
  OR: "the PNW",
};

// Return a human-readable place name for a tour stop. Tries city-specific
// colloquial first, then region-level colloquial, then full state/province
// name, finally the raw region code.
export function regionColloquial(city: string | null, region: string): string {
  const key = `${(city ?? "").toLowerCase()}|${region}`;
  return (
    CITY_COLLOQUIAL[key] ??
    REGION_COLLOQUIAL[region] ??
    REGION_NAME[region] ??
    region
  );
}

export function regionName(region: string): string {
  return REGION_NAME[region] ?? region;
}
