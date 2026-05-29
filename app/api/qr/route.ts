import { qrSvg } from "../../lib/qr";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const d = searchParams.get("d") ?? "/rsvp";
  return new Response(qrSvg(d), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
