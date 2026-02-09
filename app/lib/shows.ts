export interface Show {
  id: string;
  slug: string;
  name: string;
  date: string;
  doorTime: string;
  city: string;
  region: string;
  country: string;
  venue: string | null;
  address: string | null;
  status: "upcoming" | "past" | "cancelled";
}

const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";

export async function getShows(): Promise<Show[]> {
  const res = await fetch(`${SHOWS_API}/chorus/shows`, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  return res.json();
}

export async function getUpcomingShows(): Promise<Show[]> {
  const shows = await getShows();
  const now = new Date();
  return shows
    .filter((s) => s.status === "upcoming" && new Date(s.date + "T23:59:59") > now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

export async function getShowBySlug(slug: string): Promise<Show | null> {
  const shows = await getShows();
  return shows.find((s) => s.slug === slug) || null;
}
