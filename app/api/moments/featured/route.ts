import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, s3Bucket } from "../../shared/s3";
import { getFeatured } from "../../shared/moments";

const VIEW_TTL = 21600;

export async function GET() {
  if (!s3 || !s3Bucket) return NextResponse.json({ items: [] });

  const keys = await getFeatured();
  const items = await Promise.all(
    keys.map(async (key) => ({
      key,
      url: await getSignedUrl(
        s3!,
        new GetObjectCommand({ Bucket: s3Bucket!, Key: key }),
        { expiresIn: VIEW_TTL },
      ),
    })),
  );

  return NextResponse.json({ items });
}
