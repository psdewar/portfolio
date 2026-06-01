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

export function contentKey(filename: string, hash: string) {
  const dot = filename.lastIndexOf(".");
  const ext =
    dot > 0 ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  return ext ? `drops/${hash}.${ext}` : `drops/${hash}`;
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
