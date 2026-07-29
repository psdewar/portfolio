import { NextResponse } from "next/server";
import { FUND_LEGS, getFundingLegSlug } from "./legs";

export async function GET() {
  const slug = (await getFundingLegSlug()) ?? Object.keys(FUND_LEGS)[0];
  // Relative Location keeps the redirect host-agnostic (no 0.0.0.0 in dev).
  return new NextResponse(null, { status: 307, headers: { Location: `/fund/${slug}#cover` } });
}
