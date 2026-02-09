import { NextRequest } from "next/server";
import { screenshotPoster } from "../shared";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return screenshotPoster(`/rsvp/${slug}`);
}
