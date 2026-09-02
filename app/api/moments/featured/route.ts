import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
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
  orderByFundingLeg,
  type ThumbEntry,
  type ThumbSize,
} from "../../shared/moments";

export const maxDuration = 60;

const VIEW_TTL = 21600;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const THUMB_BATCH = 8;

// Stable public base for thumbs (R2 custom domain). Set = cacheable immutable
// URLs; unset = fall back to presigning.
const MEDIA_BASE = process.env.MOMENTS_MEDIA_BASE?.replace(/\/+$/, "");

function signView(key: string) {
  return getSignedUrl(s3!, new GetObjectCommand({ Bucket: s3Bucket!, Key: key }), {
    expiresIn: VIEW_TTL,
  });
}

type CoreItem = {
  key: string;
  thumbKey?: string;
  thumbSizes?: ThumbSize[];
  previewKey?: string;
  city?: string;
  w?: number;
  h?: number;
};

// The stable heart of the payload: no signed URLs, so it caches until an admin
// change purges the tag (with a day-long backstop). Thumb and dims backfill
// still run here for anything upload-time processing missed.
const getCore = unstable_cache(
  async (leg: string | undefined): Promise<CoreItem[]> => {
    const featured = await getFeatured();
    const [dims, thumbs, previewList, cities] = await Promise.all([
      getDims(),
      getThumbs(),
      s3!.send(
        new ListObjectsV2Command({ Bucket: s3Bucket!, Prefix: "previews/", MaxKeys: 1000 }),
      ),
      resolveCities(featured),
    ]);
    const keys = leg ? await orderByFundingLeg(featured, cities, leg) : featured;
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

    return keys.map((key) => {
      const t = thumbs[key];
      const d = dims[key];
      const preview = previewKeys.has(previewKeyFor(key)) ? previewKeyFor(key) : undefined;
      const wh = t ? { w: t.w, h: t.h } : Array.isArray(d) ? { w: d[0], h: d[1] } : {};
      return {
        key,
        ...(t ? { thumbKey: t.key, thumbSizes: t.sizes } : {}),
        ...(preview ? { previewKey: preview } : {}),
        ...(cities[key] ? { city: cities[key] } : {}),
        ...wh,
      };
    });
  },
  ["moments-featured-core"],
  { tags: ["moments-featured"], revalidate: 86400 },
);

export async function GET(request: Request) {
  if (!s3 || !s3Bucket) return NextResponse.json({ items: [] });

  const leg = new URL(request.url).searchParams.get("leg") || undefined;
  const core = await getCore(leg);

  const items = await Promise.all(
    core.map(async (c) => {
      const thumb = c.thumbKey
        ? MEDIA_BASE
          ? `${MEDIA_BASE}/${c.thumbKey}`
          : await signView(c.thumbKey)
        : c.previewKey
          ? await signView(c.previewKey)
          : undefined;
      const srcSet = c.thumbSizes?.length
        ? (
            await Promise.all(
              c.thumbSizes.map(async (s) => {
                const url = MEDIA_BASE ? `${MEDIA_BASE}/${s.key}` : await signView(s.key);
                return `${url} ${s.w}w`;
              }),
            )
          ).join(", ")
        : undefined;
      return {
        key: c.key,
        ...(thumb ? { thumb } : {}),
        ...(srcSet ? { srcSet } : {}),
        ...(c.city ? { city: c.city } : {}),
        ...(c.w && c.h ? { w: c.w, h: c.h } : {}),
      };
    }),
  );

  return NextResponse.json(
    { items },
    {
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
