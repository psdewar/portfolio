import { NextRequest } from "next/server";
import { getLeg } from "../../../../fund/legs";
import { takeScreenshot } from "../../../../lib/screenshot";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const PROJECT_FALLBACK = new URL(
  "/images/covers/fund-next-single-cover.jpg",
  "https://peytspencer.com",
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const leg = await getLeg(slug);
  if (!leg) return Response.redirect(PROJECT_FALLBACK);

  const base = process.env.OG_BASE_URL || new URL(request.url).origin;
  try {
    const screenshot = await takeScreenshot({
      path: `${base}/fund/${leg.slug}`,
      viewport: { width: 450, height: 800 },
      deviceScaleFactor: 2,
      waitForTimeout: 3500,
    });
    return new Response(screenshot, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Fund OG screenshot failed:", error);
    return Response.redirect(new URL("/og/home.jpeg", "https://peytspencer.com"));
  }
}
