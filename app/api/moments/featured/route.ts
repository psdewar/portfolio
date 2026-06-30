import { NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, s3Bucket } from "../../shared/s3";
import {
  getFeatured,
  getDims,
  recordDims,
  probeImageDims,
  getThumbs,
  generateThumb,
  recordThumbs,
  type ThumbEntry,
} from "../../shared/moments";

const VIEW_TTL = 21600;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

function signView(key: string) {
  return getSignedUrl(s3!, new GetObjectCommand({ Bucket: s3Bucket!, Key: key }), {
    expiresIn: VIEW_TTL,
  });
}

export async function GET() {
  if (!s3 || !s3Bucket) return NextResponse.json({ items: [] });

  const keys = await getFeatured();
  const [dims, thumbs] = await Promise.all([getDims(), getThumbs()]);

  const missingDims = keys.filter((k) => !dims[k] && IMAGE_EXT.test(k));
  if (missingDims.length) {
    const found: Record<string, [number, number]> = {};
    await Promise.all(
      missingDims.map(async (key) => {
        const d = await probeImageDims(key);
        if (d) {
          dims[key] = d;
          found[key] = d;
        }
      }),
    );
    if (Object.keys(found).length) await recordDims(found);
  }

  const missingThumbs = keys.filter((k) => !thumbs[k] && IMAGE_EXT.test(k));
  if (missingThumbs.length) {
    const found: Record<string, ThumbEntry> = {};
    await Promise.all(
      missingThumbs.map(async (key) => {
        const t = await generateThumb(key);
        if (t) {
          thumbs[key] = t;
          found[key] = t;
        }
      }),
    );
    if (Object.keys(found).length) await recordThumbs(found);
  }

  const items = await Promise.all(
    keys.map(async (key) => {
      const t = thumbs[key];
      const d = dims[key];
      const [url, thumb] = await Promise.all([
        signView(key),
        t ? signView(t.key) : Promise.resolve(undefined),
      ]);
      const wh = t ? { w: t.w, h: t.h } : Array.isArray(d) ? { w: d[0], h: d[1] } : {};
      return { key, url, ...(thumb ? { thumb } : {}), ...wh };
    }),
  );

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=14400",
      },
    },
  );
}
