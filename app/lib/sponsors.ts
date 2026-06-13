const SPONSORS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";

export interface Sponsor {
  showSlug?: string;
  role?: string;
  name?: string;
  email?: string;
  phone?: string;
  venue?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  date?: string;
  doorTime?: string;
  items?: string[];
  submittedAt?: string;
}

export async function getSponsors(): Promise<Sponsor[]> {
  try {
    const res = await fetch(`${SPONSORS_API}/chorus/sponsors`, { cache: "no-store" });
    if (!res.ok) {
      console.error("[sponsors] fetch failed:", res.status);
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[sponsors] fetch error:", error);
    return [];
  }
}

export async function getHostForShow(slug: string): Promise<Sponsor | null> {
  const sponsors = await getSponsors();
  return sponsors.find((s) => s.showSlug === slug && s.role === "host") ?? null;
}
