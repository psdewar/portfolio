import { NextRequest, NextResponse } from "next/server";
import { CHECKIN_COOKIE, resolveCheckinPath } from "../lib/checkin-show";

export async function GET(request: NextRequest) {
  const target = await resolveCheckinPath(request.cookies.get(CHECKIN_COOKIE)?.value);
  return new NextResponse(null, { status: 307, headers: { Location: target } });
}
