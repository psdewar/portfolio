import type { NextResponse } from "next/server";
import { doorTimeMinutes, todayIn } from "./dates";
import { getShows, isShowDraft, type Show } from "./shows";

export const CHECKIN_COOKIE = "checkin";
export const CHECKIN_COOKIE_MAX_AGE = 14 * 24 * 60 * 60;
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

function isRunnable(show: Show): boolean {
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

export async function resolveCheckinSlug(cookieValue?: string): Promise<string | null> {
  const shows = (await getShows()).filter(isRunnable);

  const own = parseCheckinCookie(cookieValue);
  if (own && shows.some((s) => s.slug === own.slug)) return own.slug;

  const today = shows
    .filter(isShowToday)
    .sort((a, b) => doorTimeMinutes(a.doorTime) - doorTimeMinutes(b.doorTime));
  if (today[0]) return today[0].slug;

  const earliestToday = todayIn("Pacific/Honolulu");
  const floor = shiftDate(earliestToday, -REOPEN_DAYS);
  const recent = shows
    .filter((s) => s.date < earliestToday && s.date >= floor)
    .sort((a, b) =>
      a.date === b.date
        ? doorTimeMinutes(b.doorTime) - doorTimeMinutes(a.doorTime)
        : a.date < b.date
          ? 1
          : -1,
    );
  return recent[0]?.slug ?? null;
}

export async function resolveCheckinPath(cookieValue?: string): Promise<string> {
  const slug = await resolveCheckinSlug(cookieValue);
  return slug ? `/checkin/${slug}` : "/rsvp";
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
