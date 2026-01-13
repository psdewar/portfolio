import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { origin } = new URL(req.url);
  const coverSrc = `${origin}/images/covers/fund-next-single-cover.jpg`;

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
