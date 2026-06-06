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
  planStatus?: "intent" | "booked" | "complete";
  access?: "public" | "private";
  tags?: string | null;
  taglineSuffix?: string | null;
  venueImg?: string | null;
  // Venue logo display width in px; blank/null uses the default CSS sizing.
  venueImgWidth?: number | null;
  // Tagline alignment: "justify" (default) or "left".
  taglineAlign?: string | null;
  // Manual override: never chain this show into a pamphlet leg.
  standalone?: boolean | null;
  // Eventbrite event id, set when the show is auto-published to Eventbrite.
  eventbriteId?: string | null;
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

export async function getUpcomingShows(): Promise<Show[]> {
  const shows = await getShows();
  return shows
    .filter(isShowUpcoming)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getShowBySlug(slug: string): Promise<Show | null> {
  const shows = await getShows();
  return shows.find((s) => s.slug === slug) || null;
}

export function getVenueLabel(show: Pick<Show, "venueLabel" | "venue">): string | null {
  return show.venueLabel || show.venue || null;
}

export function getDoorLabel(show: Pick<Show, "doorLabel" | "doorTime">): string {
  return show.doorLabel || `Doors open at ${show.doorTime || "7PM"}`;
}
