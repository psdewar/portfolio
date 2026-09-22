export interface LocationFields {
  venue?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
}

export const CITY_LEVEL_PLACE_TYPES = [
  "locality",
  "sublocality",
  "sublocality_level_1",
  "neighborhood",
  "postal_town",
  "postal_code",
  "colloquial_area",
  "administrative_area_level_1",
  "administrative_area_level_2",
  "administrative_area_level_3",
  "country",
];

// "Bwe Kafe, West Palm Beach, FL" → parts, when the typer never picked a
// suggestion. Two- or three-plus-part comma form only.
export function parseTypedLocation(raw: string): LocationFields | null {
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;
  if (parts.length === 2) {
    return { venue: "", address: "", city: parts[0], region: parts[1] };
  }
  const head = parts.slice(0, -2).join(", ");
  const city = parts[parts.length - 2];
  const region = parts[parts.length - 1];
  return /^\d/.test(head)
    ? { venue: "", address: head, city, region }
    : { venue: head, address: "", city, region };
}

export function locationError(
  loc: LocationFields,
  opts?: { allowCityOnly?: boolean; typed?: string },
): string | null {
  const city = (loc.city || "").trim();
  const region = (loc.region || "").trim();
  const venue = (loc.venue || "").trim();
  const address = (loc.address || "").trim();

  if (!city || !region) {
    return opts?.typed
      ? "Add city and state, like 'Bwe Kafe, West Palm Beach, FL'."
      : "Add the venue or address.";
  }
  if (!opts?.allowCityOnly && !venue && !address) {
    return "Pick the venue from the list or add the street address.";
  }
  return null;
}

export function resolveLocation(
  state: LocationFields,
  typed: string,
  opts?: { allowCityOnly?: boolean },
): { loc: LocationFields; error: null } | { loc: null; error: string } {
  const hasCityRegion = !!(state.city || "").trim() && !!(state.region || "").trim();
  const parsed = hasCityRegion ? null : (parseTypedLocation(typed) ?? {});
  const loc: LocationFields = hasCityRegion
    ? state
    : {
        ...parsed,
        venue: (state.venue || "").trim() ? state.venue : parsed?.venue,
        address: (state.address || "").trim() ? state.address : parsed?.address,
      };

  const error = locationError(loc, { allowCityOnly: opts?.allowCityOnly, typed });
  if (error) return { loc: null, error };
  return { loc, error: null };
}
