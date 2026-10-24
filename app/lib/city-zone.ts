import { cache } from "react";

export const REGION_NAMES: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California", CO: "Colorado",
  CT: "Connecticut", DE: "Delaware", DC: "District of Columbia", FL: "Florida", GA: "Georgia", HI: "Hawaii",
  ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa", KS: "Kansas", KY: "Kentucky", LA: "Louisiana",
  ME: "Maine", MD: "Maryland", MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio", OK: "Oklahoma",
  OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota",
  TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  AB: "Alberta", BC: "British Columbia", MB: "Manitoba", NB: "New Brunswick",
  NL: "Newfoundland and Labrador", NS: "Nova Scotia", ON: "Ontario", PE: "Prince Edward Island",
  QC: "Quebec", SK: "Saskatchewan",
};

interface GeoResult {
  admin1?: string;
  population?: number;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface CityGeo {
  timezone: string;
  latitude: number;
  longitude: number;
}

const lookup = cache(async (city: string, region: string, country: string): Promise<CityGeo | null> => {
  const regionName = REGION_NAMES[region.trim().toUpperCase()];
  if (!city.trim() || !regionName) return null;
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city.trim())}&count=100&countryCode=${encodeURIComponent(country)}`;
    const res = await fetch(url, { next: { revalidate: 2592000 } });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: GeoResult[] };
    const match = (data.results ?? [])
      .filter((r) => r.timezone && r.admin1?.toLowerCase() === regionName.toLowerCase())
      .sort((a, b) => (b.population ?? 0) - (a.population ?? 0))[0];
    if (!match?.timezone || match.latitude == null || match.longitude == null) return null;
    return { timezone: match.timezone, latitude: match.latitude, longitude: match.longitude };
  } catch {
    return null;
  }
});

const CANADIAN_REGIONS = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK"]);

function lookupCity(city?: string | null, region?: string | null, country?: string) {
  const code = (region ?? "").trim().toUpperCase();
  return lookup(city ?? "", code, country ?? (CANADIAN_REGIONS.has(code) ? "CA" : "US"));
}

export async function getCityZone(city?: string | null, region?: string | null, country?: string): Promise<string | null> {
  return (await lookupCity(city, region, country))?.timezone ?? null;
}

export async function getCityCoords(
  city?: string | null,
  region?: string | null,
  country?: string,
): Promise<{ latitude: number; longitude: number } | null> {
  return lookupCity(city, region, country);
}
