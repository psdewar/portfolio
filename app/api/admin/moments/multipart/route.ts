import { NextResponse } from "next/server";
import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  ListPartsCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, s3Bucket } from "../../../shared/s3";
import { isAdminAuthorized } from "../../../shared/admin-auth";
import { sanitizeFilename } from "../../../shared/moments";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    action?: string;
    filename?: string;
    contentType?: string;
    key?: string;
    uploadId?: string;
    partNumber?: number;
  };

  if (body.action === "create") {
    if (!body.filename) return NextResponse.json({ error: "Missing filename." }, { status: 400 });
    const key = `drops/${Date.now()}-${sanitizeFilename(body.filename)}`;
    const res = await s3.send(
      new CreateMultipartUploadCommand({
        Bucket: s3Bucket,
        Key: key,
        ContentType: body.contentType || "application/octet-stream",
      }),
    );
    return NextResponse.json({ key, uploadId: res.UploadId });
  }

  const { key, uploadId } = body;
  if (!key || !key.startsWith("drops/") || !uploadId) {
    return NextResponse.json({ error: "Invalid key or uploadId." }, { status: 400 });
  }

  if (body.action === "sign") {
    const partNumber = Number(body.partNumber);
    if (!Number.isInteger(partNumber) || partNumber < 1 || partNumber > 10000) {
      return NextResponse.json({ error: "Invalid part number." }, { status: 400 });
    }
    const url = await getSignedUrl(
      s3,
      new UploadPartCommand({ Bucket: s3Bucket, Key: key, UploadId: uploadId, PartNumber: partNumber }),
      { expiresIn: 3600 },
    );
    return NextResponse.json({ url });
  }

  if (body.action === "parts") {
    const res = await s3.send(
      new ListPartsCommand({ Bucket: s3Bucket, Key: key, UploadId: uploadId }),
    );
    return NextResponse.json({ parts: (res.Parts || []).map((p) => p.PartNumber) });
  }

  if (body.action === "complete") {
    const res = await s3.send(
      new ListPartsCommand({ Bucket: s3Bucket, Key: key, UploadId: uploadId }),
    );
    const parts = (res.Parts || [])
      .map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag }))
      .sort((a, b) => (a.PartNumber ?? 0) - (b.PartNumber ?? 0));
    await s3.send(
      new CompleteMultipartUploadCommand({
        Bucket: s3Bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      }),
    );
    return NextResponse.json({ ok: true, key });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
