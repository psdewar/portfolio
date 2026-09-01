import { NextRequest } from "next/server";
import { getShowBySlug, needsHostLocation } from "../../../lib/shows";
import { getLegs, posterLineFor } from "../../../fund/legs";
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
  // The leg's pamphlet facet carries print-only overrides saved from the poster editor.
  const posterLabel = show.leg ? posterLineFor(await getLegs(), show) : null;
  const effShow = {
    ...show,
    doorLabel: doorLabelParam !== null ? doorLabelParam : show.doorLabel,
  };
  const html = posterHtml(effShow, {
    format,
    label: sp.get("label") || show.taglineSuffix || DEFAULT_TAGLINE,
    tags: sp.get("tags") ?? show.tags ?? PAY_WHAT_YOU_WANT_TAG,
    doorsOpenOverride: sp.get("doorsOpen") ?? "",
    posterLine: venueLabelParam !== null ? venueLabelParam : posterLabel,
    posterImgSrc: await inlineVenueImg(sp.get("posterImg") ?? show.posterImg ?? ""),
    bgImgSrc: await inlineVenueImg(sp.get("bgImg") ?? show.bgImg ?? ""),
    venueImgSrc: await inlineVenueImg(sp.get("venueImg") ?? show.venueImg ?? ""),
    venueImgWidth: Number(sp.get("venueImgW")) || show.venueImgWidth || undefined,
    venueImgOffsetY: Number(sp.get("venueImgOffsetY")) || show.venueImgOffsetY || undefined,
    centerLogo: sp.has("centerLogo") ? sp.get("centerLogo") === "1" : !!show.centerLogo,
    taglineAlign: sp.get("align") || show.taglineAlign || "left",
    scale: Math.min(2, Math.max(0.5, Number(sp.get("scale")) || show.locationScale || 1)),
    invite: needsHostLocation(show),
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
          "Content-Disposition": `inline; filename="poster-${slug}${suffix}.jpg"`,
          "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
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
