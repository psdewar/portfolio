import { NextResponse } from "next/server";
import { GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
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
  previewKeyFor,
  resolveCities,
  type ThumbEntry,
} from "../../shared/moments";

export const maxDuration = 60;

const VIEW_TTL = 21600;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;
const THUMB_BATCH = 4;

function signView(key: string) {
  return getSignedUrl(s3!, new GetObjectCommand({ Bucket: s3Bucket!, Key: key }), {
    expiresIn: VIEW_TTL,
  });
}

export async function GET() {
  if (!s3 || !s3Bucket) return NextResponse.json({ items: [] });

  const keys = await getFeatured();
  const [dims, thumbs, previewList, cities] = await Promise.all([
    getDims(),
    getThumbs(),
    s3.send(
      new ListObjectsV2Command({ Bucket: s3Bucket, Prefix: "previews/", MaxKeys: 1000 }),
    ),
    resolveCities(keys),
  ]);
  const previewKeys = new Set(
    (previewList.Contents || [])
      .map((o) => o.Key || "")
      .filter((k) => k && k !== "previews/"),
  );

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

  const missingThumbs = keys.filter((k) => !thumbs[k]).slice(0, THUMB_BATCH);
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
      const preview = previewKeys.has(previewKeyFor(key)) ? previewKeyFor(key) : null;
      const [url, thumb, view] = await Promise.all([
        signView(key),
        t ? signView(t.key) : preview ? signView(preview) : Promise.resolve(undefined),
        !VIDEO_EXT.test(key) && preview ? signView(preview) : Promise.resolve(undefined),
      ]);
      const wh = t ? { w: t.w, h: t.h } : Array.isArray(d) ? { w: d[0], h: d[1] } : {};
      const city = cities[key];
      return {
        key,
        url,
        ...(thumb ? { thumb } : {}),
        ...(view ? { view } : {}),
        ...(city ? { city } : {}),
        ...wh,
      };
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
