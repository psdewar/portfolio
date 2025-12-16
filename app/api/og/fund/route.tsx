import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { origin } = new URL(req.url);
  const leftSrc = `${origin}/images/home/mb1.jpeg`;
  const rightSrc = `${origin}/images/home/new-era-3-square.jpeg`;

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
    { width: 1200, height: 630 }
  );
}
