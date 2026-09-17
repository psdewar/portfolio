import { cache } from "react";
import { doorTimeMinutes, isDatePast } from "./dates";
import { getJourneyEvents, type TimelineEvent } from "../data/timeline";

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
  eventName?: string | null;
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
  // Custom poster artwork replacing the generated one: a /public file
  // ("posters/woodinville-wa-0.jpg") or an image URL. Blank keeps the generated poster.
  posterImg?: string | null;
  // Photo behind the generated poster, replacing the default concert shot. Same
  // input as posterImg, but the layout, text, date, and QR still render on top.
  bgImg?: string | null;
  // Optional reason shown on the private-concert overlay (e.g. "Youth camp", "Private house concert").
  privateNote?: string | null;
  // Hide the private reason from the public tour list; the locked row falls back to "No public RSVP".
  hidePrivateNote?: boolean | null;
  // Private show only: where its direct /rsvp/<slug> link redirects (a site path, e.g. "/fund/norcal").
  // Empty falls back to "/rsvp". A "/fund/..." target also shows a networking nudge toast.
  privateRedirect?: string | null;
  // Tagline alignment: "left" (default) or "justify".
  taglineAlign?: string | null;
  // Poster location line size multiplier; blank/null renders at 1.
  locationScale?: number | null;
  // Poster location line override for a show without a leg; the leg's pamphlet facet wins once it has one.
  posterLine?: string | null;
  // Manual override: never chain this show into a pamphlet leg.
  standalone?: boolean | null;
  // The night belongs to the host's own gathering and I play a set inside it.
  guestSet?: boolean | null;
  // Below private: on no public surface at all, but still counts on its leg's fund page.
  unlisted?: boolean | null;
  // Eventbrite event id, set when the show is auto-published to Eventbrite.
  eventbriteId?: string | null;
  // The leg (trip grouping) this show belongs to; matches a Leg.slug.
  leg?: string | null;
}

const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";

// Renamed legs: shows still tagged with the old slug read as the new one until
// the records are re-pointed, so code and data never have to land together.
const LEG_ALIASES: Record<string, string> = { carolinas: "south-carolina" };

export const getShows = cache(async (): Promise<Show[]> => {
  const res = await fetch(`${SHOWS_API}/chorus/shows`, { cache: "no-store" });
  if (!res.ok) return [];
  const shows: Show[] = await res.json();
  return shows.map((s) => (s.leg && LEG_ALIASES[s.leg] ? { ...s, leg: LEG_ALIASES[s.leg] } : s));
});

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

// The one draft whose host link goes out to many people while shopping dates.
// Every other draft is a pending booking for one host and is retired once booked.
export const OPEN_INVITE_SLUG = "draft-0";

export function isOpenInvite(show: Pick<Show, "slug" | "stage" | "visibility">): boolean {
  return isShowDraft(show) && show.slug === OPEN_INVITE_SLUG;
}

// Drafts (unconfirmed) are hidden, and so are unlisted bookings. Confirmed shows
// surface — public ones open for RSVP, private ones as locked (no-RSVP) tour stops.
export function isShowListed(show: Pick<Show, "stage" | "visibility" | "unlisted">): boolean {
  return !isShowDraft(show) && !show.unlisted;
}

// A show the public can see on a listing: live (not cancelled) and not a draft.
export function isShowListable(
  show: Pick<Show, "status" | "stage" | "visibility" | "unlisted">,
): boolean {
  return show.status !== "cancelled" && isShowListed(show);
}

// Every real stop, unlisted included — for the fund page; public uses isShowListable.
export function isShowOnTrip(show: Pick<Show, "status" | "stage" | "visibility">): boolean {
  return show.status !== "cancelled" && !isShowDraft(show);
}

// A completed show: a real stop (confirmed, not cancelled) whose date has passed.
// Nothing writes stage "complete" yet, so completion is derived, not read.
export function isShowCompleted(
  show: Pick<Show, "date" | "status" | "stage" | "visibility">,
): boolean {
  return isShowOnTrip(show) && isDatePast(show.date);
}

// The single source for stay-connected lists: completed shows, newest first.
export function completedShows(shows: Show[]): Show[] {
  return shows.filter(isShowCompleted).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function getUpcomingShows(): Promise<Show[]> {
  const shows = await getShows();
  return shows
    .filter(isShowUpcoming)
    .filter(isShowListed)
    .sort(
      (a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime() ||
        doorTimeMinutes(a.doorTime) - doorTimeMinutes(b.doorTime),
    );
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
  show: Pick<Show, "date" | "status" | "stage" | "visibility" | "unlisted" | "region">,
): boolean {
  if (show.status === "cancelled" || !isShowListed(show) || show.visibility === "private") {
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

// A press-kit invite: created without a location, so the host supplies it (and the
// date) at confirmation. Its poster invites rather than announces.
export function needsHostLocation(show: { city?: string | null; region?: string | null }): boolean {
  return !show.city?.trim() || !show.region?.trim();
}

export function getDoorLabel(show: { doorLabel?: string | null; doorTime?: string | null }): string {
  return show.doorLabel || `Doors open at ${show.doorTime || "7PM"}`;
}

// The poster's location line, split so each renderer can keep city/region on one
// line. venueLabel (the venue's name) leads the city/region; otherwise venue (or
// address) does. A posterLine is a fully composed override (print-only facet) and
// wins outright, unmodified. Parts a show doesn't have yet are dropped rather than
// printed empty.
export function getPosterLocation(
  show: {
    venueLabel?: string | null;
    venue?: string | null;
    address?: string | null;
    city?: string | null;
    region?: string | null;
  },
  posterLine?: string | null,
): { label: string | null; prefix: string; cityRegion: string } {
  const cityRegion = [show.city, show.region]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  const lead = (show.venue || show.address || "").trim();
  const prefix = lead && cityRegion ? `${lead}, ` : lead;
  const override = posterLine?.trim();
  if (override) return { label: override, prefix, cityRegion };
  const venueLabel = show.venueLabel?.trim() || null;
  const endsWithCity =
    !!venueLabel && !!cityRegion && venueLabel.toLowerCase().endsWith(cityRegion.toLowerCase());
  return {
    label: venueLabel ? (cityRegion && !endsWithCity ? `${venueLabel}, ${cityRegion}` : venueLabel) : null,
    prefix,
    cityRegion,
  };
}

export function getPosterLocationText(
  show: Parameters<typeof getPosterLocation>[0],
  posterLine?: string | null,
): string {
  const loc = getPosterLocation(show, posterLine);
  return loc.label ?? `${loc.prefix}${loc.cityRegion}`;
}

export function isGuestSet(show: Pick<Show, "guestSet">): boolean {
  return !!show.guestSet;
}

// Concerts that count toward the tour total: every completed stop that was my own show.
export function getTourConcertCount(shows: Show[]): number {
  return shows.filter((s) => isShowCompleted(s) && !isGuestSet(s)).length;
}

export function showToTimelineEvent(show: Show, sameDayIndex = 0): TimelineEvent {
  const upcoming = isShowUpcoming(show);
  return {
    id: Number(show.date.replace(/-/g, "") + "5" + sameDayIndex),
    date: show.date,
    title: show.name === "From The Ground Up" ? "From The Ground Up Live Concert" : show.name,
    location: `${show.city}, ${show.region}`,
    description: isResidence(show) ? "House concert" : getVenueLabel(show) ?? undefined,
    type: "show",
    ...(upcoming && show.visibility !== "private"
      ? { url: `/rsvp/${show.slug}`, urlLabel: "RSVP" }
      : {}),
  };
}

// Listable shows as timeline rows, newest first; same-date shows get distinct ids.
export function showsToTimelineEvents(shows: Show[]): TimelineEvent[] {
  const sorted = [...shows].sort((a, b) => (a.date < b.date ? 1 : -1));
  const seen: Record<string, number> = {};
  return sorted.map((s) => {
    const i = seen[s.date] ?? 0;
    seen[s.date] = i + 1;
    return showToTimelineEvent(s, i);
  });
}

// The full show history for public surfaces: completed chorus shows plus the
// hand-kept pre-chorus rows in TIMELINE, newest first.
export async function getShowHistory(): Promise<TimelineEvent[]> {
  const shows = await getShows();
  const past = shows.filter((s) => isShowListable(s) && isShowCompleted(s));
  return [...showsToTimelineEvents(past), ...getJourneyEvents().filter((e) => e.type === "show")]
    .sort((a, b) => (a.date === b.date ? b.id - a.id : a.date < b.date ? 1 : -1));
}
