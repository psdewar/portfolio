import { takeScreenshot } from "../../../lib/screenshot";

const FALLBACK_IMAGE = new URL("/Jan23OpenMicNight-08_Original.jpg", "https://peytspencer.com");

export async function screenshotPoster(path: string): Promise<Response> {
  try {
    const screenshot = await takeScreenshot({
      path,
      selector: ".poster",
      viewport: { width: 480, height: 780 },
      deviceScaleFactor: 3,
      waitForTimeout: 1500,
    });

    return new Response(screenshot, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Screenshot failed:", error);
    return Response.redirect(FALLBACK_IMAGE);
  }
}
