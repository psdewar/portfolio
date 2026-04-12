import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

const endpoint = process.env.S3_ENDPOINT;
const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const bucket = process.env.S3_BUCKET;
const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

const s3 =
  endpoint && accessKeyId && secretAccessKey
    ? new S3Client({
        region: "auto",
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        forcePathStyle,
      })
    : null;

function sanitizeEmail(email: string) {
  return email.toLowerCase().replace(/[^a-z0-9@._+-]/g, "-");
}

function sanitizeFilename(name: string) {
  return name.replace(/[^\w.-]/g, "_").slice(0, 200);
}

export async function POST(request: Request) {
  const ip = getClientIP(request);
  const rateCheck = checkRateLimit(ip, "moments-sign", {
    windowMs: 60 * 60 * 1000,
    maxRequests: 200,
  });
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)) },
      },
    );
  }

  if (!s3 || !bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }
  if (!process.env.MOMENTS_PASSCODE) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const { passcode, email, filename, contentType } = body as Record<string, string>;

  if (passcode !== process.env.MOMENTS_PASSCODE) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!email || !filename) {
    return NextResponse.json({ error: "Missing email or filename" }, { status: 400 });
  }

  const key = `drops/${sanitizeEmail(email)}/${Date.now()}-${sanitizeFilename(filename)}`;

  try {
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType || "application/octet-stream",
      }),
      { expiresIn: 900 },
    );
    return NextResponse.json({ url, key });
  } catch (err) {
    console.error("[moments/sign] error", err);
    return NextResponse.json({ error: "Failed to sign URL" }, { status: 500 });
  }
}
