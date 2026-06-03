import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, s3Bucket } from "../../shared/s3";
import { getFeatured, getDims, recordDims, probeImageDims } from "../../shared/moments";

const VIEW_TTL = 21600;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

export async function GET() {
  if (!s3 || !s3Bucket) return NextResponse.json({ items: [] });

  const keys = await getFeatured();
  const dims = await getDims();

  const missing = keys.filter((k) => !dims[k] && IMAGE_EXT.test(k));
  if (missing.length) {
    const found: Record<string, [number, number]> = {};
    await Promise.all(
      missing.map(async (key) => {
        const d = await probeImageDims(key);
        if (d) {
          dims[key] = d;
          found[key] = d;
        }
      }),
    );
    if (Object.keys(found).length) await recordDims(found);
  }

  const items = await Promise.all(
    keys.map(async (key) => {
      const d = dims[key];
      return {
        key,
        url: await getSignedUrl(
          s3!,
          new GetObjectCommand({ Bucket: s3Bucket!, Key: key }),
          { expiresIn: VIEW_TTL },
        ),
        ...(Array.isArray(d) ? { w: d[0], h: d[1] } : {}),
      };
    }),
  );

  return NextResponse.json({ items });
}
