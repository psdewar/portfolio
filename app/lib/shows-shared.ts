import { isDatePast, todayIn } from "./dates";
import type { TimelineEvent } from "../data/timeline";

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
  stage?: "intent" | "booked" | "complete";
  visibility?: "public" | "private" | "draft";
  tags?: string | null;
  taglineSuffix?: string | null;
  venueImg?: string | null;
  venueImgWidth?: number | null;
  venueImgOffsetY?: number | null;
  centerLogo?: boolean | null;
  posterImg?: string | null;
  bgImg?: string | null;
  privateNote?: string | null;
  hidePrivateNote?: boolean | null;
  hideHost?: boolean | null;
  privateRedirect?: string | null;
  taglineAlign?: string | null;
  locationScale?: number | null;
  posterLine?: string | null;
  standalone?: boolean | null;
  guestSet?: boolean | null;
  fundDefault?: number | null;
  unlisted?: boolean | null;
  eventbriteId?: string | null;
  leg?: string | null;
}


const LEG_SHORT_NAMES: Record<string, string> = {
  "south-florida": "South Florida",
  "british-columbia": "British Columbia",
  "third-culture": "Third Culture",
  "new-jersey": "New Jersey",
  dmv: "The DMV",
  norcal: "NorCal",
  "norcal-2": "NorCal 2",
  woodinville: "Woodinville",
  socal: "SoCal",
  "south-carolina": "South Carolina",
};

export function getLegDisplayName(leg: string): string {
  if (LEG_SHORT_NAMES[leg]) return LEG_SHORT_NAMES[leg];
  return leg
    .replace(/-\d+$/, "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const GRACE_MS = 36 * 60 * 60 * 1000;

export function isShowUpcoming(show: Pick<Show, "date" | "status">): boolean {
  return show.status !== "cancelled" && new Date(show.date).getTime() + GRACE_MS > Date.now();
}

export function isShowDraft(show: Pick<Show, "stage" | "visibility">): boolean {
  return show.stage === "intent" || show.visibility === "draft";
}

export const OPEN_INVITE_SLUG = "draft-0";

export function isOpenInvite(show: Pick<Show, "slug" | "stage" | "visibility">): boolean {
  return isShowDraft(show) && show.slug === OPEN_INVITE_SLUG;
}

export function isShowListed(show: Pick<Show, "stage" | "visibility" | "unlisted">): boolean {
  return !isShowDraft(show) && !show.unlisted;
}

export function isShowListable(
  show: Pick<Show, "status" | "stage" | "visibility" | "unlisted">,
): boolean {
  return show.status !== "cancelled" && isShowListed(show);
}

export function isShowOnTrip(show: Pick<Show, "status" | "stage" | "visibility">): boolean {
  return show.status !== "cancelled" && !isShowDraft(show);
}

export function isShowCompleted(
  show: Pick<Show, "date" | "status" | "stage" | "visibility">,
): boolean {
  return isShowOnTrip(show) && isDatePast(show.date);
}

export function completedShows(shows: Show[]): Show[] {
  return shows.filter(isShowCompleted).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function listableShows(shows: Show[]): Show[] {
  return shows
    .filter(isShowListable)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export function isCheckinLive(
  show: Pick<Show, "date" | "status" | "stage" | "visibility" | "unlisted">,
): boolean {
  if (show.status === "cancelled" || !isShowListed(show) || show.visibility === "private") {
    return false;
  }
  return show.date === todayIn("America/New_York") || show.date === todayIn("Pacific/Honolulu");
}

export function getVenueLabel(show: Pick<Show, "venueLabel" | "venue" | "hideHost">): string | null {
  if (show.hideHost) return null;
  return show.venueLabel || show.venue || null;
}

export function isResidence(show: Pick<Show, "venue" | "address">): boolean {
  const num = (show.venue ?? "").trim().match(/^\d+/)?.[0];
  return !!num && (show.address ?? "").trim().startsWith(num);
}

export function publicVenueName(
  show: Pick<Show, "venue" | "address" | "hideHost"> & { venueLabel?: string | null },
): string | null {
  if (show.hideHost) return null;
  return isResidence(show) ? show.venueLabel || null : show.venueLabel || show.venue || null;
}

export function needsHostLocation(show: { city?: string | null; region?: string | null }): boolean {
  return !show.city?.trim() || !show.region?.trim();
}

export function getDoorLabel(show: { doorLabel?: string | null; doorTime?: string | null }): string {
  return show.doorLabel || `Doors open at ${show.doorTime || "7PM"}`;
}

export function getPosterLocation(
  show: {
    venueLabel?: string | null;
    venue?: string | null;
    address?: string | null;
    city?: string | null;
    region?: string | null;
    hideHost?: boolean | null;
  },
  posterLine?: string | null,
): { label: string | null; prefix: string; cityRegion: string } {
  const cityRegion = [show.city, show.region]
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(", ");
  if (show.hideHost) return { label: cityRegion || null, prefix: "", cityRegion };
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

export function getTourConcertCount(shows: Show[]): number {
  return shows.filter((s) => isShowCompleted(s) && !isGuestSet(s)).length;
}

export function showToTimelineEvent(show: Show, sameDayIndex = 0): TimelineEvent {
  const upcoming = isShowUpcoming(show);
  return {
    id: Number(show.date.replace(/-/g, "") + "5" + sameDayIndex),
    date: show.date,
    title:
      show.eventName ||
      (show.name === "From The Ground Up" ? "From The Ground Up Live Concert" : show.name),
    location: `${show.city}, ${show.region}`,
    description: isResidence(show)
      ? publicVenueName(show) || "House concert"
      : (upcoming && show.visibility === "private" && show.privateNote) ||
        getVenueLabel(show) ||
        undefined,
    type: "show",
    ...(upcoming && show.visibility !== "private"
      ? { url: `/rsvp/${show.slug}`, urlLabel: "RSVP" }
      : {}),
  };
}

export function orderedShowsToTimelineEvents(shows: Show[]): TimelineEvent[] {
  const seen: Record<string, number> = {};
  return shows.map((s) => {
    const i = seen[s.date] ?? 0;
    seen[s.date] = i + 1;
    return showToTimelineEvent(s, i);
  });
}

export function showsToTimelineEvents(shows: Show[]): TimelineEvent[] {
  const sorted = [...shows].sort((a, b) => (a.date < b.date ? 1 : -1));
  return orderedShowsToTimelineEvents(sorted);
}
