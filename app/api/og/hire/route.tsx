import { takeScreenshot } from "../../../lib/screenshot";
import { hireOgHtml, OG_DIMS } from "../../../lib/og-html";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const screenshot = await takeScreenshot({
      path: "about:blank",
      selector: ".poster",
      viewport: OG_DIMS,
      deviceScaleFactor: 2,
      waitForTimeout: 1500,
      htmlContent: hireOgHtml(),
    });
    return new Response(screenshot, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Screenshot failed:", error);
    return Response.redirect(new URL("/images/home/bio.jpeg", "https://peytspencer.com"));
  }
}
