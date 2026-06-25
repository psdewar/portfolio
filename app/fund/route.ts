import { NextResponse } from "next/server";
import { FUND_LEGS, getLegs } from "./legs";
import { getUpcomingShows } from "../lib/shows";

export async function GET() {
  const [legs, shows] = await Promise.all([getLegs(), getUpcomingShows()]);
  const fundable = new Set(legs.filter((l) => l.fund).map((l) => l.slug));
  const next = shows.find((s) => s.leg && fundable.has(s.leg));
  const slug = next?.leg ?? legs.find((l) => l.fund)?.slug ?? Object.keys(FUND_LEGS)[0];
  // Relative Location keeps the redirect host-agnostic (no 0.0.0.0 in dev).
  return new NextResponse(null, { status: 307, headers: { Location: `/fund/${slug}#cover` } });
}
