import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
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
