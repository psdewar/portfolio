import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(req: Request) {
  const { origin } = new URL(req.url);
  const src = `${origin}/images/home/bio.jpeg`;
  return new ImageResponse(<img alt="bio" src={src} />);
}
