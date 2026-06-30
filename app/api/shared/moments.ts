import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import sharp from "sharp";
import { s3, s3Bucket } from "./s3";

const FEATURED_KEY = "featured.json";

export function sanitizeFilename(name: string) {
  return name.replace(/[^\w.-]/g, "_").slice(0, 200);
}

export function contentKey(filename: string, hash: string, captured?: number) {
  const dot = filename.lastIndexOf(".");
  const ext =
    dot > 0 ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const body = captured ? `${hash}-${captured}` : hash;
  return ext ? `drops/${body}.${ext}` : `drops/${body}`;
}

export async function objectExists(key: string): Promise<boolean> {
  if (!s3 || !s3Bucket) return false;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: s3Bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function createUploadUrl(
  filename: string,
  contentType?: string,
  key?: string,
) {
  const objectKey = key || `drops/${Date.now()}-${sanitizeFilename(filename)}`;
  const url = await getSignedUrl(
    s3!,
    new PutObjectCommand({
      Bucket: s3Bucket!,
      Key: objectKey,
      ContentType: contentType || "application/octet-stream",
    }),
    { expiresIn: 900 },
  );
  return { url, key: objectKey };
}

export async function getFeatured(): Promise<string[]> {
  if (!s3 || !s3Bucket) return [];
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: s3Bucket, Key: FEATURED_KEY }),
    );
    const text = await res.Body?.transformToString();
    const parsed = text ? JSON.parse(text) : [];
    return Array.isArray(parsed)
      ? parsed.filter((k): k is string => typeof k === "string")
      : [];
  } catch {
    return [];
  }
}

export async function setFeatured(keys: string[]): Promise<void> {
  if (!s3 || !s3Bucket) return;
  await s3.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: FEATURED_KEY,
      Body: JSON.stringify(keys),
      ContentType: "application/json",
    }),
  );
}

const OG_KEY = "og.json";

// The single moment chosen as the link-preview (OG) image, separate from the
// slideshow order. Empty/unset means surfaces fall back to their own default.
export async function getOgKey(): Promise<string | null> {
  if (!s3 || !s3Bucket) return null;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: OG_KEY }));
    const text = await res.Body?.transformToString();
    const parsed = text ? JSON.parse(text) : null;
    return typeof parsed === "string" && parsed.startsWith("drops/") ? parsed : null;
  } catch {
    return null;
  }
}

export async function setOgKey(key: string | null): Promise<void> {
  if (!s3 || !s3Bucket) return;
  await s3.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: OG_KEY,
      Body: JSON.stringify(key),
      ContentType: "application/json",
    }),
  );
}

const OG_FALLBACK = "https://peytspencer.com/og/home.jpeg";
const OG_VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;

// Renders the chosen OG moment (or the first slideshow photo) as one resized
// JPEG Response. Backs /api/og/moments, which the fund page shows in place of
// the gallery during OG capture.
export async function renderOgMoment(): Promise<Response> {
  if (!s3 || !s3Bucket) return Response.redirect(OG_FALLBACK);

  const [ogKey, featured] = await Promise.all([getOgKey(), getFeatured()]);
  const key =
    ogKey && !OG_VIDEO_EXT.test(ogKey) ? ogKey : featured.find((k) => !OG_VIDEO_EXT.test(k));
  if (!key) return Response.redirect(OG_FALLBACK);

  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) return Response.redirect(OG_FALLBACK);

    const jpeg = await sharp(Buffer.from(bytes))
      .rotate()
      .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    return new Response(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("renderOgMoment failed for", key, error);
    return Response.redirect(OG_FALLBACK);
  }
}

const DIMS_KEY = "dims.json";

export async function getDims(): Promise<Record<string, [number, number]>> {
  if (!s3 || !s3Bucket) return {};
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: DIMS_KEY }));
    const text = await res.Body?.transformToString();
    const parsed = text ? JSON.parse(text) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, [number, number]>) : {};
  } catch {
    return {};
  }
}

export async function recordDims(entries: Record<string, [number, number]>): Promise<void> {
  if (!s3 || !s3Bucket) return;
  const current = await getDims();
  let changed = false;
  for (const [key, dim] of Object.entries(entries)) {
    if (
      key.startsWith("drops/") &&
      !current[key] &&
      Array.isArray(dim) &&
      dim.length === 2 &&
      Number.isFinite(dim[0]) &&
      Number.isFinite(dim[1]) &&
      dim[0] > 0 &&
      dim[1] > 0
    ) {
      current[key] = [Math.round(dim[0]), Math.round(dim[1])];
      changed = true;
    }
  }
  if (!changed) return;
  await s3.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: DIMS_KEY,
      Body: JSON.stringify(current),
      ContentType: "application/json",
    }),
  );
}

const u16be = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32be = (b: Uint8Array, o: number) =>
  ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

function parseImageDims(b: Uint8Array): [number, number] | null {
  // PNG
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return [u32be(b, 16), u32be(b, 20)];
  }
  // GIF
  if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return [u16le(b, 6), u16le(b, 8)];
  }
  // WebP
  if (
    b.length >= 30 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    const fmt = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (fmt === "VP8 ") return [u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff];
    if (fmt === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
    if (fmt === "VP8X") {
      return [
        1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
        1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
      ];
    }
  }
  // JPEG
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) {
        o++;
        continue;
      }
      const marker = b[o + 1];
      if (marker === 0xff) {
        o++;
        continue;
      }
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        o += 2;
        continue;
      }
      if (
        marker >= 0xc0 && marker <= 0xcf &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      ) {
        return [u16be(b, o + 7), u16be(b, o + 5)];
      }
      const len = u16be(b, o + 2);
      if (len < 2) break;
      o += 2 + len;
    }
  }
  return null;
}

export async function probeImageDims(key: string): Promise<[number, number] | null> {
  if (!s3 || !s3Bucket) return null;
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: s3Bucket, Key: key, Range: "bytes=0-262143" }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) return null;
    return parseImageDims(bytes);
  } catch {
    return null;
  }
}

const THUMBS_KEY = "thumbs.json";
const THUMB_HEIGHT = 1280;
const THUMB_QUALITY = 60;

export type ThumbEntry = { key: string; w: number; h: number };

export function thumbKeyFor(originalKey: string): string {
  const base = originalKey.replace(/^drops\//, "").replace(/\.[^./]+$/, "");
  return `thumbs/${base}.avif`;
}

export async function getThumbs(): Promise<Record<string, ThumbEntry>> {
  if (!s3 || !s3Bucket) return {};
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: THUMBS_KEY }));
    const text = await res.Body?.transformToString();
    const parsed = text ? JSON.parse(text) : {};
    return parsed && typeof parsed === "object" ? (parsed as Record<string, ThumbEntry>) : {};
  } catch {
    return {};
  }
}

export async function recordThumbs(entries: Record<string, ThumbEntry>): Promise<void> {
  if (!s3 || !s3Bucket || Object.keys(entries).length === 0) return;
  const current = await getThumbs();
  for (const [key, entry] of Object.entries(entries)) current[key] = entry;
  await s3.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: THUMBS_KEY,
      Body: JSON.stringify(current),
      ContentType: "application/json",
    }),
  );
}

export async function makeThumb(input: Uint8Array): Promise<{ data: Buffer; w: number; h: number }> {
  const out = await sharp(input)
    .rotate()
    .resize({ height: THUMB_HEIGHT, withoutEnlargement: true })
    .avif({ quality: THUMB_QUALITY })
    .toBuffer({ resolveWithObject: true });
  return { data: out.data, w: out.info.width, h: out.info.height };
}

export async function uploadThumb(originalKey: string, data: Buffer, w: number, h: number): Promise<ThumbEntry> {
  const key = thumbKeyFor(originalKey);
  await s3!.send(
    new PutObjectCommand({
      Bucket: s3Bucket!,
      Key: key,
      Body: data,
      ContentType: "image/avif",
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return { key, w, h };
}

export async function generateThumb(originalKey: string): Promise<ThumbEntry | null> {
  if (!s3 || !s3Bucket) return null;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: originalKey }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) return null;
    const { data, w, h } = await makeThumb(bytes);
    return await uploadThumb(originalKey, data, w, h);
  } catch {
    return null;
  }
}
