import "server-only";
import { revalidateTag } from "next/cache";

const CHORUS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";

export const CHORUS_TOKEN = process.env.SCHEDULE_API_TOKEN;

export const chorusTag = (resource: string) => `chorus:${resource}`;

export async function chorusFetch(resource: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (CHORUS_TOKEN) headers.set("Authorization", `Bearer ${CHORUS_TOKEN}`);
  const res = await fetch(`${CHORUS_API}/chorus/${resource}`, { ...init, headers });
  const method = (init.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && res.ok) {
    revalidateTag(chorusTag(resource), { expire: 0 });
  }
  return res;
}

export function chorusRead(
  resource: string,
  revalidateSeconds = 60,
  init: RequestInit = {},
) {
  return chorusFetch(resource, {
    ...init,
    next: { revalidate: revalidateSeconds, tags: [chorusTag(resource)] },
  });
}

export async function chorusList<T>(resource: string): Promise<T[]> {
  try {
    const res = await chorusFetch(resource, { cache: "no-store" });
    if (!res.ok) {
      console.error(`[${resource}] GET failed:`, res.status, await res.text());
      return [];
    }
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error(`[${resource}] GET error:`, error);
    return [];
  }
}
