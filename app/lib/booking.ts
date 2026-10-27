import "server-only";
import { parseDoorTime } from "./dates";
import { REGION_NAMES, getCityZone } from "./city-zone";
import { DOOR_TIMES } from "./door-times";
import { wallTimeToUtcIso } from "./eventbrite";
import { chorusFetch } from "./chorus";
import { OPEN_INVITE_SLUG, type Show } from "./shows-shared";
import type { Leg } from "../fund/legs-shared";

export const SHOW_MINUTES = 150;
export const RECOVERY_MINUTES = 30;
export const SETUP_MINUTES = 30;
export const MIN_GAP_MINUTES = 120;

const LEG_RADIUS_DAYS = 3;
const SAME_TOWN_DRIVE_MINUTES = 15;
const MAX_SEARCH_DAYS = 60;
const DAY_MS = 86_400_000;

export const SCHEDULE_FIELDS = ["date", "doorTime", "venue", "address", "city", "region", "country"] as const;

type Place = Pick<Show, "venue" | "address" | "city" | "region"> & { country?: string | null };
export type BookingCandidate = Place & Pick<Show, "date" | "doorTime"> & { slug?: string; leg?: string | null };

export type SpacingResult =
  | { ok: true }
  | {
      ok: false;
      conflict: { slug: string; date: string; doorTime: string };
      earliestSameDay: string | null;
      nextOpenDate: string;
    };

type SpacingDeps = {
  drive?: (a: Place, b: Place) => Promise<number | null>;
  zone?: (p: Place) => Promise<string>;
};

const norm = (v?: string | null) => (v || "").trim().toLowerCase();
const sameTown = (a: Place, b: Place) => norm(a.city) === norm(b.city) && norm(a.region) === norm(b.region);
const sameRegion = (a: Place, b: Place) =>
  norm(a.region) === norm(b.region) && norm(a.country || "US") === norm(b.country || "US");

const dayNumber = (iso: string) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY_MS);
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

const slugify = (v: string) =>
  v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const addressOf = (p: Place) =>
  [p.address || p.venue, p.city, p.region, p.country || "US"].filter(Boolean).join(", ");

const driveCache = new Map<string, number>();

export async function driveMinutes(a: Place, b: Place): Promise<number | null> {
  if (sameTown(a, b) && !a.address && !b.address) return SAME_TOWN_DRIVE_MINUTES;
  const key = [addressOf(a), addressOf(b)].sort().join("|");
  const cached = driveCache.get(key);
  if (cached !== undefined) return cached;

  const apiKey = process.env.GOOGLE_MAPS_SERVER_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration",
      },
      body: JSON.stringify({
        origin: { address: addressOf(a) },
        destination: { address: addressOf(b) },
        travelMode: "DRIVE",
      }),
    });
    if (!res.ok) throw new Error(`Routes ${res.status}`);
    const seconds = parseInt((await res.json()).routes?.[0]?.duration, 10);
    if (!Number.isFinite(seconds)) return null;
    const minutes = Math.ceil(seconds / 60);
    driveCache.set(key, minutes);
    return minutes;
  } catch (e) {
    console.error("[booking] drive time failed:", e);
    return null;
  }
}

export function assignLeg(
  candidate: BookingCandidate,
  shows: Show[],
  legs: Pick<Leg, "slug">[],
): string | null {
  if (!candidate.region || !candidate.date) return null;
  const day = dayNumber(candidate.date);
  let best: { leg: string; distance: number } | null = null;
  for (const s of shows) {
    if (!s.leg || !s.date || s.slug === OPEN_INVITE_SLUG || s.slug === candidate.slug) continue;
    if (s.status === "cancelled" || !sameRegion(s, candidate)) continue;
    const distance = Math.abs(dayNumber(s.date) - day);
    if (distance <= LEG_RADIUS_DAYS && (!best || distance < best.distance)) {
      best = { leg: s.leg, distance };
    }
  }
  if (best) return best.leg;

  const base = slugify(REGION_NAMES[candidate.region.trim().toUpperCase()] || candidate.region);
  return legs.some((l) => l.slug === base) ? `${base}-${candidate.date.slice(0, 4)}` : base;
}

export async function resolveLeg(
  candidate: BookingCandidate,
  shows: Show[],
  legs: Pick<Leg, "slug">[],
): Promise<string | null> {
  const kept =
    candidate.leg &&
    shows.some((s) => s.leg === candidate.leg && s.slug !== OPEN_INVITE_SLUG && sameRegion(s, candidate));
  if (kept) return candidate.leg!;

  const leg = assignLeg(candidate, shows, legs);
  if (leg && !legs.some((l) => l.slug === leg)) {
    const res = await chorusFetch("legs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: leg }),
    });
    if (!res.ok) throw new Error((await res.text()) || "Failed to add leg");
  }
  return leg;
}

async function readStrict<T>(resource: string): Promise<T[]> {
  const res = await chorusFetch(resource, { cache: "no-store" });
  if (!res.ok) throw new Error(`Could not read ${resource} (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error(`Unexpected ${resource} response`);
  return data;
}

export const loadShows = () => readStrict<Show>("shows");

export async function deleteSponsors(slug: string) {
  const sponsors = await readStrict<{ showSlug?: string; submittedAt?: string }>("sponsors");
  for (const s of sponsors) {
    if (s.showSlug !== slug || !s.submittedAt) continue;
    await chorusFetch("sponsors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ showSlug: slug, submittedAt: s.submittedAt }),
    });
  }
}

export const newDraftSlug = () => `draft-${Date.now().toString(36)}`;

export async function loadBookingContext() {
  const [shows, legs] = await Promise.all([loadShows(), readStrict<Leg>("legs")]);
  return { shows, legs };
}

export function scheduleChanged(existing: Partial<Show>, next: Partial<Show>) {
  return SCHEDULE_FIELDS.some(
    (f) => f in next && (next[f] ?? "") !== (existing[f] ?? ""),
  );
}

export async function checkSpacing(
  candidate: BookingCandidate,
  shows: Show[],
  deps: SpacingDeps = {},
): Promise<SpacingResult> {
  if (!candidate.date) return { ok: true };
  const drive = deps.drive ?? driveMinutes;
  const zoneFor =
    deps.zone ??
    (async (p: Place) => (await getCityZone(p.city, p.region, p.country || undefined)) ?? "UTC");
  const zones = new Map<string, Promise<string>>();
  const zoneOf = (p: Place) => {
    const key = `${norm(p.city)}|${norm(p.region)}|${norm(p.country)}`;
    if (!zones.has(key)) zones.set(key, zoneFor(p));
    return zones.get(key)!;
  };
  const startMinute = async (p: Place & Pick<Show, "date" | "doorTime">) => {
    const { h, m } = parseDoorTime(p.doorTime);
    return Date.parse(wallTimeToUtcIso(p.date, h, m, await zoneOf(p))) / 60000;
  };

  const others = shows.filter(
    (s) => s.slug !== candidate.slug && s.stage !== "intent" && s.status !== "cancelled" && s.date,
  );

  const conflictFor = async (c: BookingCandidate): Promise<Show | null> => {
    const cStart = await startMinute(c);
    for (const o of others) {
      if (Math.abs(dayNumber(o.date) - dayNumber(c.date)) > 1) continue;
      const gap = Math.abs((await startMinute(o)) - cStart) - SHOW_MINUTES;
      const driving = await drive(c, o);
      if (driving === null) {
        if (o.date === c.date && !sameTown(c, o)) return o;
        if (gap < MIN_GAP_MINUTES) return o;
        continue;
      }
      if (gap < Math.max(MIN_GAP_MINUTES, RECOVERY_MINUTES + driving + SETUP_MINUTES)) return o;
    }
    return null;
  };

  const conflict = await conflictFor(candidate);
  if (!conflict) return { ok: true };

  let earliestSameDay: string | null = null;
  for (const t of DOOR_TIMES) {
    if (!(await conflictFor({ ...candidate, doorTime: t }))) {
      earliestSameDay = t;
      break;
    }
  }

  let nextOpenDate = addDays(candidate.date, 1);
  for (let i = 1; i < MAX_SEARCH_DAYS; i++) {
    if (!(await conflictFor({ ...candidate, date: nextOpenDate }))) break;
    nextOpenDate = addDays(nextOpenDate, 1);
  }

  return {
    ok: false,
    conflict: { slug: conflict.slug, date: conflict.date, doorTime: conflict.doorTime },
    earliestSameDay,
    nextOpenDate,
  };
}

export const conflictBody = (r: Extract<SpacingResult, { ok: false }>) => ({
  error: "conflict",
  earliestSameDay: r.earliestSameDay,
  nextOpenDate: r.nextOpenDate,
});
