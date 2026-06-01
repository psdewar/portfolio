import { NextResponse } from "next/server";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, s3Bucket } from "../../shared/s3";
import { sanitizeFilename, contentKey, objectExists } from "../../shared/moments";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

const MIN_PART = 5 * 1024 * 1024;
const DEFAULT_PART = 8 * 1024 * 1024;
const MAX_PARTS = 10000;
const PART_URL_TTL = 12 * 60 * 60;

function partSizeFor(size: number) {
  let part = DEFAULT_PART;
  if (Math.ceil(size / part) > MAX_PARTS) part = Math.ceil(size / MAX_PARTS);
  return Math.max(part, MIN_PART);
}

function presignParts(key: string, uploadId: string, partCount: number) {
  return Promise.all(
    Array.from({ length: partCount }, (_, i) =>
      getSignedUrl(
        s3!,
        new UploadPartCommand({
          Bucket: s3Bucket!,
          Key: key,
          UploadId: uploadId,
          PartNumber: i + 1,
        }),
        { expiresIn: PART_URL_TTL },
      ),
    ),
  );
}

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rate = checkRateLimit(ip, "moments-multipart", {
    windowMs: 60 * 60 * 1000,
    maxRequests: 500,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rate.resetIn / 1000)) } },
    );
  }

  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }
  if (!process.env.MOMENTS_PASSCODE) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.passcode !== process.env.MOMENTS_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (body.action === "create") {
    const filename = typeof body.filename === "string" ? body.filename : "";
    const size = Number(body.size);
    if (!filename) {
      return NextResponse.json({ error: "Missing filename" }, { status: 400 });
    }
    if (!Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: "Missing size" }, { status: 400 });
    }

    const hash =
      typeof body.hash === "string" && /^[a-f0-9]{64}$/.test(body.hash)
        ? body.hash
        : "";
    const captured =
      typeof body.captured === "number" &&
      Number.isFinite(body.captured) &&
      body.captured > 0
        ? Math.floor(body.captured)
        : undefined;
    const key = hash
      ? contentKey(filename, hash, captured)
      : `drops/${Date.now()}-${sanitizeFilename(filename)}`;
    if (hash && (await objectExists(key))) {
      return NextResponse.json({ key, exists: true });
    }

    const created = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: s3Bucket,
        Key: key,
        ContentType:
          typeof body.contentType === "string" && body.contentType
            ? body.contentType
            : "application/octet-stream",
      }),
    );
    const uploadId = created.UploadId!;
    const partSize = partSizeFor(size);
    const partCount = Math.ceil(size / partSize);
    const partUrls = await presignParts(key, uploadId, partCount);

    return NextResponse.json({ key, uploadId, partSize, partUrls, exists: false });
  }

  if (body.action === "complete") {
    const { key, uploadId, parts } = body as {
      key?: string;
      uploadId?: string;
      parts?: Array<{ partNumber: number; etag: string }>;
    };
    if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json({ error: "Missing complete params" }, { status: 400 });
    }
    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: s3Bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts
            .slice()
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((p) => ({ PartNumber: p.partNumber, ETag: p.etag })),
        },
      }),
    );
    return NextResponse.json({ ok: true, key });
  }

  if (body.action === "abort") {
    const { key, uploadId } = body as { key?: string; uploadId?: string };
    if (!key || !uploadId) {
      return NextResponse.json({ error: "Missing abort params" }, { status: 400 });
    }
    await s3.send(
      new AbortMultipartUploadCommand({ Bucket: s3Bucket, Key: key, UploadId: uploadId }),
    );
    return NextResponse.json({ ok: true });
  }

  if (body.action === "resume") {
    const key = typeof body.key === "string" ? body.key : "";
    const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
    const size = Number(body.size);
    if (!key || !uploadId || !Number.isFinite(size) || size <= 0) {
      return NextResponse.json({ error: "Missing resume params" }, { status: 400 });
    }
    const partSize = partSizeFor(size);
    const partCount = Math.ceil(size / partSize);

    const uploadedParts: Array<{ partNumber: number; etag: string }> = [];
    try {
      let marker: string | undefined;
      do {
        const listed = await s3.send(
          new ListPartsCommand({
            Bucket: s3Bucket,
            Key: key,
            UploadId: uploadId,
            PartNumberMarker: marker,
          }),
        );
        for (const p of listed.Parts || []) {
          if (p.PartNumber != null && p.ETag) {
            uploadedParts.push({ partNumber: p.PartNumber, etag: p.ETag });
          }
        }
        marker = listed.IsTruncated ? listed.NextPartNumberMarker : undefined;
      } while (marker);
    } catch {
      return NextResponse.json(
        { error: "Upload session expired", expired: true },
        { status: 410 },
      );
    }

    const partUrls = await presignParts(key, uploadId, partCount);
    return NextResponse.json({ key, uploadId, partSize, partUrls, uploadedParts });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
