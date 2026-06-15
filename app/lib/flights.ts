// Per-show client-side flights: turn a behavior change on for a show via Show.flights,
// then compare on/off shows in PostHog by the flight_<key> property.
export const PAYMENT_MODEL = "payment-model";

// PostHog-safe property name for a flight key (hyphens break some breakdowns).
export function flightProp(key: string): string {
  return `flight_${key.replace(/-/g, "_")}`;
}
