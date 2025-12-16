import { ImageResponse } from "next/og";

export const runtime = "edge";

// NOTE: Temporary logic: for now we serve the same paired image for the generic /indie
// OG (handled elsewhere) and for the flight-to-boise slug we intentionally mirror a
// specific pairing. Additional slugs can be added to the mapping below over time.

// Quick mapping of slug -> left/right image paths (full URLs built at request time)
const slugImagePairs: Record<string, { left: string; right: string }> = {
  "flight-to-boise": {
    left: "/images/home/mb1.jpeg",
    right: "/images/home/new-era-3-square.jpeg",
  },
};

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { origin } = new URL(req.url);
  const { slug } = params;

  const pair = slugImagePairs[slug] || slugImagePairs["flight-to-boise"];
  const leftSrc = `${origin}${pair.left}`;
  const rightSrc = `${origin}${pair.right}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "1200px",
          height: "630px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <img
          src={leftSrc}
          alt="left"
          style={{ objectFit: "cover", width: "50%", height: "100%" }}
        />
        <img
          src={rightSrc}
          alt="right"
          style={{ objectFit: "cover", width: "50%", height: "100%" }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
