import { NextRequest, NextResponse } from "next/server";
import { confirmPath } from "../../lib/confirm";
import { isAdminAuthorized } from "../shared/admin-auth";

// Admin-only: mint the signed confirmation link for a show so the artist can send it
// to a host without leaving the hosts admin. Gated so signatures never leak publicly.
export async function GET(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const slug = request.nextUrl.searchParams.get("slug");
  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });
  return NextResponse.json({ url: confirmPath(slug) });
}
