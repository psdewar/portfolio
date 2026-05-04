export interface Show {
  id?: string;
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
  status: "upcoming" | "past" | "cancelled";
  planStatus?: "intent" | "booked" | "complete";
  visibility?: "draft" | "private" | "public";
}

const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";

export async function getShows(): Promise<Show[]> {
  const res = await fetch(`${SHOWS_API}/chorus/shows`, { cache: "no-store" });
  if (!res.ok) return [];
  const raw: (Show & { access?: "public" | "private" })[] = await res.json();
  return raw.map(({ access, ...show }) => ({
    ...show,
    visibility: show.visibility ?? access,
  }));
}

const GRACE_MS = 36 * 60 * 60 * 1000;

export async function getUpcomingShows(): Promise<Show[]> {
  const shows = await getShows();
  const nowMs = Date.now();
  return shows
    .filter(
      (s) =>
        s.status === "upcoming" &&
        s.visibility !== "draft" &&
        new Date(s.date).getTime() + GRACE_MS > nowMs,
    )
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
