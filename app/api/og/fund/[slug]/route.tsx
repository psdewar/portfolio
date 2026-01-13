import { ImageResponse } from "next/og";

export const runtime = "edge";

// Mapping of slug -> cover image. Default to fund-next-single-cover.
const slugCovers: Record<string, string> = {
  "flight-to-boise": "/images/covers/fund-next-single-cover.jpg",
};

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { origin } = new URL(req.url);
  const { slug } = await params;

  const coverPath = slugCovers[slug] || "/images/covers/fund-next-single-cover.jpg";
  const coverSrc = `${origin}${coverPath}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          fontFamily: "system-ui, sans-serif",
          background: "#000",
        }}
      >
        <img
          src={coverSrc}
          alt="Fund"
          style={{ objectFit: "cover", width: "100%", height: "100%" }}
        />
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
