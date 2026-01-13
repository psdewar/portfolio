import { takeScreenshot } from "../../../lib/screenshot";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    // Use iPhone Pro Max dimensions (430x932) for mobile layout
    const screenshot = await takeScreenshot({
      path: "/live",
      viewport: { width: 430, height: 932 },
      waitForTimeout: 1500,
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
