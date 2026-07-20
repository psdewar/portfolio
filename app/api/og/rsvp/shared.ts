import { type Show } from "../../../lib/shows";
import { takeScreenshot } from "../../../lib/screenshot";
import { posterHtml, inlineVenueImg, POSTER_DIMS } from "../../poster/html";
import { PAY_WHAT_YOU_WANT_TAG } from "../../../lib/poster-defaults";

const FALLBACK_IMAGE = new URL("/Jan23OpenMicNight-08_Original.jpg", "https://peytspencer.com");

export function fallbackResponse(): Response {
  return Response.redirect(FALLBACK_IMAGE);
}

export async function screenshotPoster(show: Show): Promise<Response> {
  const { W, H } = POSTER_DIMS.standard;

  try {
    // Inlining is inside the try: a custom poster naming a file that isn't
    // deployed yet throws, and a link preview must degrade to the fallback
    // image rather than 500.
    const html = posterHtml(show, {
      tags: show.tags ?? PAY_WHAT_YOU_WANT_TAG,
      posterImgSrc: await inlineVenueImg(show.posterImg ?? ""),
    });

    const screenshot = await takeScreenshot({
      path: "about:blank",
      selector: ".poster",
      viewport: { width: W, height: H },
      deviceScaleFactor: 2,
      waitForTimeout: 1500,
      htmlContent: html,
    });

    return new Response(screenshot, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("OG poster failed:", error);
    return fallbackResponse();
  }
}
