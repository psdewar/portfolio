export interface Show {
  slug: string;
  name: string;
  date: string;
  doorTime: string;
  city: string;
  region: string;
  country: string;
  venue: string | null;
  venueLabel: string | null;
  doorLabel: string | null;
  address: string | null;
  status?: "cancelled";
  // Booking lifecycle: "intent" = draft (awaiting host confirmation) → "booked" = confirmed → "complete".
  stage?: "intent" | "booked" | "complete";
  // Access: "public" (default) or "private". ("draft" is legacy — pre-`stage` drafts.)
  visibility?: "public" | "private" | "draft";
  tags?: string | null;
  taglineSuffix?: string | null;
  venueImg?: string | null;
  // Venue logo display width in px; blank/null uses the default CSS sizing.
  venueImgWidth?: number | null;
  // Venue logo vertical offset in design px; negative moves up, positive down.
  venueImgOffsetY?: number | null;
  // Center the venue logo over the tagline block.
  centerLogo?: boolean | null;
  // Optional reason shown on the private-concert overlay (e.g. "Youth camp", "Private house concert").
  privateNote?: string | null;
  // Hide the private reason from the public tour list; the locked row falls back to "No public RSVP".
  hidePrivateNote?: boolean | null;
  // Private show only: where its direct /rsvp/<slug> link redirects (a site path, e.g. "/fund/norcal").
  // Empty falls back to "/rsvp". A "/fund/..." target also shows a networking nudge toast.
  privateRedirect?: string | null;
  // Tagline alignment: "left" (default) or "justify".
  taglineAlign?: string | null;
  // Manual override: never chain this show into a pamphlet leg.
  standalone?: boolean | null;
  // Active client-side A/B flight keys for this show (e.g. "payment-model").
  flights?: string[] | null;
  // Eventbrite event id, set when the show is auto-published to Eventbrite.
  eventbriteId?: string | null;
  // The leg (trip grouping) this show belongs to; matches a Leg.slug.
  leg?: string | null;
}

const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";

export async function getShows(): Promise<Show[]> {
  const res = await fetch(`${SHOWS_API}/chorus/shows`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

const GRACE_MS = 36 * 60 * 60 * 1000;

// Past/upcoming is derived from the date; only `cancelled` is stored.
export function isShowUpcoming(show: Pick<Show, "date" | "status">): boolean {
  return show.status !== "cancelled" && new Date(show.date).getTime() + GRACE_MS > Date.now();
}

// A draft is an unconfirmed show: stage "intent", awaiting host confirmation.
// `visibility === "draft"` is the legacy signal for shows created before `stage`.
export function isShowDraft(show: Pick<Show, "stage" | "visibility">): boolean {
  return show.stage === "intent" || show.visibility === "draft";
}

// Drafts (unconfirmed) are hidden. Confirmed shows surface — public ones open for
// RSVP, private ones as locked (no-RSVP) tour stops.
export function isShowListed(show: Pick<Show, "stage" | "visibility">): boolean {
  return !isShowDraft(show);
}

// A show the public can see on a listing: live (not cancelled) and not a draft.
export function isShowListable(show: Pick<Show, "status" | "stage" | "visibility">): boolean {
  return show.status !== "cancelled" && isShowListed(show);
}

export async function getUpcomingShows(): Promise<Show[]> {
  const shows = await getShows();
  return shows
    .filter(isShowUpcoming)
    .filter(isShowListed)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getShowBySlug(slug: string): Promise<Show | null> {
  const shows = await getShows();
  return shows.find((s) => s.slug === slug) || null;
}

const CHECKIN_TZ: Record<string, string> = {
  WA: "America/Los_Angeles",
  OR: "America/Los_Angeles",
  CA: "America/Los_Angeles",
  BC: "America/Vancouver",
  NY: "America/New_York",
  NJ: "America/New_York",
  PA: "America/New_York",
  MA: "America/New_York",
  MD: "America/New_York",
  FL: "America/New_York",
  ON: "America/Toronto",
  QC: "America/Toronto",
};

// Self check-in is open only on the show's local calendar day.
export function isCheckinLive(
  show: Pick<Show, "date" | "status" | "stage" | "visibility" | "region">,
): boolean {
  if (show.status === "cancelled" || isShowDraft(show) || show.visibility === "private") {
    return false;
  }
  const tz = CHECKIN_TZ[show.region] ?? "America/New_York";
  return new Date().toLocaleDateString("en-CA", { timeZone: tz }) === show.date;
}

export function getVenueLabel(show: Pick<Show, "venueLabel" | "venue">): string | null {
  return show.venueLabel || show.venue || null;
}

// A residence: the venue reads as a street address (its leading number matches the
// full address), so public surfaces should show the city, not the door-number address.
export function isResidence(show: Pick<Show, "venue" | "address">): boolean {
  const num = (show.venue ?? "").trim().match(/^\d+/)?.[0];
  return !!num && (show.address ?? "").trim().startsWith(num);
}

export function getDoorLabel(show: Pick<Show, "doorLabel" | "doorTime">): string {
  return show.doorLabel || `Doors open at ${show.doorTime || "7PM"}`;
}
