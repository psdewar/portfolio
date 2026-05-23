import { NextRequest } from "next/server";
import { getShowBySlug } from "../../../lib/shows";
import { takePdf, takeScreenshot } from "../../../lib/screenshot";
import { posterHtml, inlineVenueImg, POSTER_DIMS, type PosterFormat } from "../html";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);

  if (!show) {
    return new Response("Show not found", { status: 404 });
  }

  const sp = request.nextUrl.searchParams;
  const rawFormat = sp.get("format") ?? "standard";
  const format: PosterFormat = rawFormat in POSTER_DIMS ? (rawFormat as PosterFormat) : "standard";
  const { W, H } = POSTER_DIMS[format];
  // venueLabel/doorLabel params let a download reflect unsaved editor state.
  const venueLabelParam = sp.get("venueLabel");
  const doorLabelParam = sp.get("doorLabel");
  const effShow = {
    ...show,
    venueLabel: venueLabelParam !== null ? venueLabelParam : show.venueLabel,
    doorLabel: doorLabelParam !== null ? doorLabelParam : show.doorLabel,
  };
  const html = posterHtml(effShow, {
    format,
    label: request.nextUrl.searchParams.get("label") || undefined,
    tags: request.nextUrl.searchParams.get("tags") ?? "",
    doorsOpenOverride: request.nextUrl.searchParams.get("doorsOpen") ?? "",
    venueImgSrc: inlineVenueImg(request.nextUrl.searchParams.get("venueImg") ?? ""),
    venueImgWidth: Number(request.nextUrl.searchParams.get("venueImgW")) || undefined,
    taglineAlign: request.nextUrl.searchParams.get("align") || undefined,
  });
  const asJpg = request.nextUrl.searchParams.get("jpg") === "true";
  const suffix = format !== "standard" ? `-${format}` : "";

  try {
    if (asJpg) {
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
          "Content-Disposition": `attachment; filename="poster-${slug}${suffix}.jpg"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const pdf = await takePdf({
      htmlContent: html,
      viewport: { width: W, height: H },
      pageFormat: format === "print" ? "Letter" : "match",
    });
    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="poster-${slug}${suffix}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Poster generation failed:", error);
    return new Response("Failed to generate poster", { status: 500 });
  }
}
