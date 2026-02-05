import { takeScreenshot } from "../../../lib/screenshot";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const screenshot = await takeScreenshot({
      path: "/rsvp",
      selector: ".poster",
      viewport: { width: 480, height: 720 },
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
    return Response.redirect(new URL("/Jan23OpenMicNight-08_Original.jpg", "https://peytspencer.com"));
  }
}
