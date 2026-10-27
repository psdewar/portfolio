import type { NextResponse } from "next/server";
import { doorTimeMinutes, todayIn } from "./dates";
import { getShows, isShowDraft, type Show } from "./shows";

export const CHECKIN_COOKIE = "checkin";
export const CHECKIN_COOKIE_MAX_AGE = 14 * 24 * 60 * 60;
export const CHECKIN_START = "2026-10-22";
const REOPEN_DAYS = 7;

export function formatCheckinCookie(slug: string, checkinId: string): string {
  return `${slug}~${checkinId}`;
}

export function parseCheckinCookie(value?: string): { slug: string; checkinId: string } | null {
  if (!value) return null;
  const at = value.lastIndexOf("~");
  if (at < 1) return null;
  return { slug: value.slice(0, at), checkinId: value.slice(at + 1) };
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function isRunnable(show: Show): boolean {
  return show.status !== "cancelled" && !isShowDraft(show);
}

export function isShowToday(show: Pick<Show, "date">): boolean {
  return show.date === todayIn("America/New_York") || show.date === todayIn("Pacific/Honolulu");
}

export function isCheckinOpen(show: Show): boolean {
  if (!isRunnable(show)) return false;
  if (isShowToday(show)) return true;
  const earliestToday = todayIn("Pacific/Honolulu");
  return show.date < earliestToday && show.date >= shiftDate(earliestToday, -REOPEN_DAYS);
}

function todayShows(shows: Show[]): Show[] {
  return shows
    .filter(isRunnable)
    .filter(isShowToday)
    .sort(
      (a, b) =>
        (a.date < b.date ? -1 : a.date > b.date ? 1 : 0) ||
        doorTimeMinutes(a.doorTime) - doorTimeMinutes(b.doorTime),
    );
}

export function pickTodayShow(shows: Show[]): Show | null {
  return todayShows(shows)[0] ?? null;
}

export const NEAR_SHOW_KM = 80;

export function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

export function recentRunnableShows(shows: Show[]): Show[] {
  const floor = shiftDate(todayIn("Pacific/Honolulu"), -REOPEN_DAYS);
  const ceiling = todayIn("America/New_York");
  return shows.filter(isRunnable).filter((s) => s.date >= floor && s.date <= ceiling);
}

export function pickCheckinSlug(shows: Show[], cookieValue?: string): string | null {
  const runnable = shows.filter(isRunnable);
  const own = parseCheckinCookie(cookieValue);

  const today = todayShows(shows);
  if (today.length > 0) {
    return today.find((s) => s.slug === own?.slug)?.slug ?? today[0].slug;
  }

  const ownShow = runnable.find((s) => s.slug === own?.slug);
  if (ownShow && isCheckinOpen(ownShow)) return ownShow.slug;

  const earliestToday = todayIn("Pacific/Honolulu");
  const recent = recentRunnableShows(shows)
    .filter((s) => s.date < earliestToday)
    .sort((a, b) =>
      a.date === b.date
        ? doorTimeMinutes(b.doorTime) - doorTimeMinutes(a.doorTime)
        : a.date < b.date
          ? 1
          : -1,
    );
  return recent[0]?.slug ?? null;
}

export async function resolveCheckinSlug(cookieValue?: string): Promise<string | null> {
  return pickCheckinSlug(await getShows(), cookieValue);
}

export async function resolveCheckinPath(cookieValue?: string): Promise<string> {
  const slug = await resolveCheckinSlug(cookieValue);
  return slug ? `/checkin/${slug}` : "/support";
}

export function setCheckinCookie(response: NextResponse, slug: string, checkinId: string) {
  response.cookies.set(CHECKIN_COOKIE, formatCheckinCookie(slug, checkinId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHECKIN_COOKIE_MAX_AGE,
  });
}
