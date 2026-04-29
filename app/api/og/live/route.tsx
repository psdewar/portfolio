import { takeScreenshot } from "../../../lib/screenshot";
import { liveOgHtml, OG_DIMS } from "../../../lib/og-html";
import { getUpcomingShows } from "../../../lib/shows";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const shows = await getUpcomingShows();
    const screenshot = await takeScreenshot({
      path: "about:blank",
      selector: ".poster",
      viewport: OG_DIMS,
      deviceScaleFactor: 2,
      waitForTimeout: 1500,
      htmlContent: liveOgHtml(shows),
    });
    return new Response(screenshot, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=60, s-maxage=60",
      },
    });
  } catch (error) {
    console.error("Screenshot failed:", error);
    return Response.redirect(new URL("/images/home/new-era-6.jpg", "https://peytspencer.com"));
  }
}
