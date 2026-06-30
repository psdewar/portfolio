import { NextResponse } from "next/server";
import {
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, s3Bucket } from "../../shared/s3";
import { isAdminAuthorized } from "../../shared/admin-auth";
import {
  getFeatured,
  setFeatured,
  getOgKey,
  setOgKey,
  getThumbs,
  sanitizeFilename,
  createUploadUrl,
} from "../../shared/moments";

const URL_TTL = 3600;

function nameFromKey(key: string) {
  return key.replace(/^drops\//, "");
}

function signView(key: string) {
  return getSignedUrl(
    s3!,
    new GetObjectCommand({ Bucket: s3Bucket!, Key: key }),
    { expiresIn: URL_TTL },
  );
}

function signDownload(key: string) {
  return getSignedUrl(
    s3!,
    new GetObjectCommand({
      Bucket: s3Bucket!,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${nameFromKey(key)}"`,
    }),
    { expiresIn: URL_TTL },
  );
}

export async function GET(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }

  const list = await s3.send(
    new ListObjectsV2Command({ Bucket: s3Bucket, Prefix: "drops/", MaxKeys: 1000 }),
  );
  const [featuredKeys, thumbs, ogKey] = await Promise.all([
    getFeatured(),
    getThumbs(),
    getOgKey(),
  ]);
  const featured = new Set(featuredKeys);

  const objects = (list.Contents || [])
    .filter((o) => o.Key && o.Key !== "drops/")
    .sort((a, b) => (a.LastModified?.getTime() || 0) - (b.LastModified?.getTime() || 0));

  const items = await Promise.all(
    objects.map(async (o) => {
      const thumb = thumbs[o.Key!];
      return {
        key: o.Key!,
        size: o.Size || 0,
        lastModified: o.LastModified?.toISOString() || null,
        url: await signView(o.Key!),
        thumb: thumb ? await signView(thumb.key) : undefined,
        downloadUrl: await signDownload(o.Key!),
        featured: featured.has(o.Key!),
      };
    }),
  );

  return NextResponse.json({ items, featuredKeys, ogKey, truncated: list.IsTruncated || false });
}

export async function POST(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }

  const { filename, contentType } = (await request.json().catch(() => ({}))) as {
    filename?: string;
    contentType?: string;
  };
  if (!filename) {
    return NextResponse.json({ error: "Missing filename." }, { status: 400 });
  }

  const { url, key } = await createUploadUrl(filename, contentType);
  return NextResponse.json({ url, key });
}

export async function DELETE(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }

  const { key } = (await request.json().catch(() => ({}))) as { key?: string };
  if (!key || !key.startsWith("drops/")) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: key }));

  const featured = await getFeatured();
  if (featured.includes(key)) {
    await setFeatured(featured.filter((k) => k !== key));
  }
  if ((await getOgKey()) === key) await setOgKey(null);

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }

  const { key, name } = (await request.json().catch(() => ({}))) as {
    key?: string;
    name?: string;
  };
  if (!key || !key.startsWith("drops/")) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Name is required." }, { status: 400 });
  }

  const tsPrefix = key.match(/^drops\/(\d+-)/)?.[1] || "";
  const oldExt = key.match(/\.[^./]+$/)?.[0] || "";
  let base = sanitizeFilename(name.trim());
  if (oldExt && !base.toLowerCase().endsWith(oldExt.toLowerCase())) base += oldExt;
  const newKey = `drops/${tsPrefix}${base}`;

  if (newKey === key) {
    return NextResponse.json({
      key,
      url: await signView(key),
      downloadUrl: await signDownload(key),
    });
  }

  await s3.send(
    new CopyObjectCommand({
      Bucket: s3Bucket,
      CopySource: `${s3Bucket}/${key}`,
      Key: newKey,
    }),
  );
  await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: key }));

  const featured = await getFeatured();
  if (featured.includes(key)) {
    await setFeatured(featured.map((k) => (k === key ? newKey : k)));
  }
  if ((await getOgKey()) === key) await setOgKey(newKey);

  return NextResponse.json({
    key: newKey,
    url: await signView(newKey),
    downloadUrl: await signDownload(newKey),
  });
}
