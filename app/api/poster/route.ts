import { NextRequest } from "next/server";
import { takePdf } from "../../lib/screenshot";
import { posterHtml } from "./html";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const date = searchParams.get("date");
  const city = searchParams.get("city");
  const region = searchParams.get("region");

  if (!date || !city || !region) {
    return new Response("date, city, and region required", { status: 400 });
  }

  const html = posterHtml(
    {
      date,
      city,
      region,
      venue: searchParams.get("venue"),
      address: searchParams.get("address"),
      doorTime: searchParams.get("doorTime") || "7PM",
      venueLabel: searchParams.get("venueLabel"),
      doorLabel: searchParams.get("doorLabel"),
    },
    searchParams.get("label") || undefined,
    "standard",
    searchParams.get("tags") ?? "",
    searchParams.get("doorsOpen") ?? "",
  );

  try {
    const pdf = await takePdf({
      htmlContent: html,
      viewport: { width: 480, height: 720 },
      pageFormat: "match",
    });

    return new Response(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="poster-custom.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Poster generation failed:", error);
    return new Response("Failed to generate poster", { status: 500 });
  }
}
