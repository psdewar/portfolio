import { takeScreenshot } from "../../../lib/screenshot";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const screenshot = await takeScreenshot({
      path: "/hire",
      viewport: { width: 430, height: 932 },
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
    return Response.redirect(new URL("/images/home/bio.jpeg", "https://peytspencer.com"));
  }
}
