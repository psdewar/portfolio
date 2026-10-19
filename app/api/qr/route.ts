import { qrSvg } from "../../lib/qr";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const d = searchParams.get("d") ?? "/rsvp";
  const tile = searchParams.get("tile") ?? undefined;
  return new Response(qrSvg(d, tile), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
