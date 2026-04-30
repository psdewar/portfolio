export interface PamphletShow {
  slug: string;
  venueLabel?: string;
}

export interface Pamphlet {
  id: string;
  label?: string;
  shows: PamphletShow[];
  showDoors?: boolean;
  showQr?: boolean;
  tags?: string;
  venueImg?: string;
  address?: string;
}

const SHOWS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";

export async function getPamphlets(): Promise<Pamphlet[]> {
  const res = await fetch(`${SHOWS_API}/chorus/pamphlets`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}
