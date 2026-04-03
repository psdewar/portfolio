import { NextRequest } from "next/server";
import { getShowBySlug } from "../../../lib/shows";
import { takeScreenshot } from "../../../lib/screenshot";
import { posterHtml } from "../html";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);

  if (!show) {
    return new Response("Show not found", { status: 404 });
  }

  const html = posterHtml(show);

  try {
    const screenshot = await takeScreenshot({
      path: "about:blank",
      selector: ".poster",
      viewport: { width: 480, height: 720 },
      deviceScaleFactor: 2,
      waitForTimeout: 1500,
      htmlContent: html,
    });

    return new Response(screenshot, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="poster-${slug}.jpg"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Poster generation failed:", error);
    return new Response("Failed to generate poster", { status: 500 });
  }
}
