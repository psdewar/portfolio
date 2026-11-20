import { NextRequest } from "next/server";
import { TRACK_DATA } from "../../../data/tracks";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const track = TRACK_DATA.find((t) => t.id === slug);
  if (!track?.thumbnail) {
    return Response.redirect(new URL("/api/og/listen", "https://peytspencer.com"));
  }

  try {
    const upstream = await fetch(new URL(track.thumbnail, request.url));
    if (!upstream.ok) {
      return Response.redirect(new URL("/api/og/listen", "https://peytspencer.com"));
    }
    return new Response(upstream.body, {
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("OG cover proxy failed for", slug, error);
    return Response.redirect(new URL("/api/og/listen", "https://peytspencer.com"));
  }
}
