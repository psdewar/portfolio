import { NextRequest } from "next/server";
import { getShowBySlug } from "../../../../lib/shows";
import { fallbackResponse, screenshotPoster } from "../shared";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);
  if (!show || show.visibility === "draft") return fallbackResponse();
  return screenshotPoster(show);
}
