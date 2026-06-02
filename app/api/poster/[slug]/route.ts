import { NextRequest } from "next/server";
import { getShowBySlug } from "../../../lib/shows";
import { takePdf, takeScreenshot } from "../../../lib/screenshot";
import { posterHtml, inlineVenueImg, POSTER_DIMS, type PosterFormat } from "../html";
import { PAY_WHAT_YOU_WANT_TAG, DEFAULT_TAGLINE } from "../../../lib/poster-defaults";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);

  if (!show) {
    return new Response("Show not found", { status: 404 });
  }

  const sp = request.nextUrl.searchParams;
  const square = sp.has("square");
  const rawFormat = square ? "yt" : (sp.get("format") ?? "standard");
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
    label: sp.get("label") || show.taglineSuffix || DEFAULT_TAGLINE,
    tags: sp.get("tags") ?? show.tags ?? PAY_WHAT_YOU_WANT_TAG,
    doorsOpenOverride: sp.get("doorsOpen") ?? "",
    venueImgSrc: inlineVenueImg(sp.get("venueImg") ?? show.venueImg ?? ""),
    venueImgWidth: Number(sp.get("venueImgW")) || show.venueImgWidth || undefined,
    taglineAlign: sp.get("align") || show.taglineAlign || "justify",
  });
  const asJpg = square || request.nextUrl.searchParams.get("jpg") === "true";
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
          "Content-Disposition": `${square ? "inline" : "attachment"}; filename="poster-${slug}${suffix}.jpg"`,
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
