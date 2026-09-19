import { NextResponse } from "next/server";
import { getStreamStatus } from "../../../lib/live";

export async function GET() {
  return NextResponse.json(await getStreamStatus());
}
