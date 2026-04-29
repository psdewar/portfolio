import { type Show } from "../../../lib/shows";
import { takeScreenshot } from "../../../lib/screenshot";
import { posterHtml, POSTER_DIMS } from "../../poster/html";

const FALLBACK_IMAGE = new URL("/Jan23OpenMicNight-08_Original.jpg", "https://peytspencer.com");

export function fallbackResponse(): Response {
  return Response.redirect(FALLBACK_IMAGE);
}

export async function screenshotPoster(show: Show): Promise<Response> {
  const { W, H } = POSTER_DIMS.standard;
  const html = posterHtml(show);

  try {
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
    console.error("Screenshot failed:", error);
    return fallbackResponse();
  }
}
