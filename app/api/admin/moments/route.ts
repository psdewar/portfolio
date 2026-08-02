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
  deleteMomentArtifacts,
  renameMomentArtifacts,
  resolveCities,
  legCityOrder,
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

  const [list, previewList, featuredKeys, thumbs, ogKey, legCities] = await Promise.all([
    s3.send(new ListObjectsV2Command({ Bucket: s3Bucket, Prefix: "drops/", MaxKeys: 1000 })),
    s3.send(new ListObjectsV2Command({ Bucket: s3Bucket, Prefix: "previews/", MaxKeys: 1000 })),
    getFeatured(),
    getThumbs(),
    getOgKey(),
    legCityOrder(),
  ]);
  const featured = new Set(featuredKeys);

  const baseOf = (key: string) =>
    key.replace(/^(drops|previews)\//, "").replace(/\.[^./]+$/, "");

  const objects = (list.Contents || [])
    .filter((o) => o.Key && o.Key !== "drops/")
    .sort((a, b) => (a.LastModified?.getTime() || 0) - (b.LastModified?.getTime() || 0));
  const dropBases = new Set(objects.map((o) => baseOf(o.Key!)));

  const previewObjects = (previewList.Contents || []).filter(
    (o) => o.Key && o.Key !== "previews/",
  );
  const previewByBase = new Map(previewObjects.map((o) => [baseOf(o.Key!), o.Key!]));
  const cities = await resolveCities(objects.map((o) => o.Key!));

  const items = await Promise.all(
    objects.map(async (o) => {
      const thumb = thumbs[o.Key!];
      const previewKey = previewByBase.get(baseOf(o.Key!));
      const thumbKey = thumb?.key ?? previewKey;
      return {
        key: o.Key!,
        size: o.Size || 0,
        lastModified: o.LastModified?.toISOString() || null,
        url: await signView(o.Key!),
        thumb: thumbKey ? await signView(thumbKey) : undefined,
        downloadUrl: await signDownload(o.Key!),
        featured: featured.has(o.Key!),
        city: cities[o.Key!],
      };
    }),
  );

  const pending = await Promise.all(
    previewObjects
      .filter((o) => !dropBases.has(baseOf(o.Key!)))
      .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))
      .map(async (o) => ({
        key: o.Key!,
        lastModified: o.LastModified?.toISOString() || null,
        url: await signView(o.Key!),
      })),
  );

  return NextResponse.json({
    items,
    pending,
    featuredKeys,
    ogKey,
    legCities,
    truncated: list.IsTruncated || false,
  });
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
  if (key && key.startsWith("previews/")) {
    await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: key }));
    return NextResponse.json({ ok: true });
  }
  if (!key || !key.startsWith("drops/")) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  await s3.send(new DeleteObjectCommand({ Bucket: s3Bucket, Key: key }));
  await deleteMomentArtifacts(key);

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
  await renameMomentArtifacts(key, newKey);

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
