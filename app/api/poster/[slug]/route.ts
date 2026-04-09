import { NextRequest } from "next/server";
import { getShowBySlug } from "../../../lib/shows";
import { takeScreenshot } from "../../../lib/screenshot";
import { posterHtml, POSTER_DIMS, type PosterFormat } from "../html";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);

  if (!show) {
    return new Response("Show not found", { status: 404 });
  }

  const rawFormat = request.nextUrl.searchParams.get("format") ?? "standard";
  const format: PosterFormat =
    rawFormat === "ig" || rawFormat === "yt" || rawFormat === "eb" ? rawFormat : "standard";
  const { W, H } = POSTER_DIMS[format];
  const html = posterHtml(show, undefined, format);

  try {
    const screenshot = await takeScreenshot({
      path: "about:blank",
      selector: ".poster",
      viewport: { width: W, height: H },
      deviceScaleFactor: 2,
      waitForTimeout: 1500,
      htmlContent: html,
    });

    const suffix = format !== "standard" ? `-${format}` : "";
    return new Response(screenshot, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="poster-${slug}${suffix}.jpg"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Poster generation failed:", error);
    return new Response("Failed to generate poster", { status: 500 });
  }
}
