const CHORUS_API = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";

export const CHORUS_TOKEN = process.env.SCHEDULE_API_TOKEN;

export function chorusFetch(resource: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (CHORUS_TOKEN) headers.set("Authorization", `Bearer ${CHORUS_TOKEN}`);
  return fetch(`${CHORUS_API}/chorus/${resource}`, { ...init, headers });
}
