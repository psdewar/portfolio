import { NextResponse } from "next/server";
import {
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
  purgeFeatured,
  getOgKey,
  setOgKey,
  getThumbs,
  sanitizeFilename,
  deleteMomentArtifacts,
  renameMomentArtifacts,
  resolveCities,
  resolveStops,
  listMomentSources,
  objectExists,
  deleteMoment,
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

function signDownload(key: string, filenameKey = key) {
  return getSignedUrl(
    s3!,
    new GetObjectCommand({
      Bucket: s3Bucket!,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${nameFromKey(filenameKey)}"`,
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

  const [sources, featuredKeys, thumbs, ogKey] = await Promise.all([
    listMomentSources(),
    getFeatured(),
    getThumbs(),
    getOgKey(),
  ]);
  const featured = new Set(featuredKeys);
  sources.sort((a, b) => (a.lastModified?.getTime() || 0) - (b.lastModified?.getTime() || 0));
  const keys = sources.map((src) => src.key);
  const cities = await resolveCities(keys);
  const stops = await resolveStops(keys, cities);

  const items = await Promise.all(
    sources.map(async (src) => {
      const thumbKey = thumbs[src.key]?.key ?? src.previewKey;
      return {
        key: src.key,
        size: src.size,
        lastModified: src.lastModified?.toISOString() || null,
        url: await signView(src.viewKey),
        thumb: thumbKey ? await signView(thumbKey) : undefined,
        downloadUrl: await signDownload(src.viewKey, src.key),
        featured: featured.has(src.key),
        city: cities[src.key],
        visit: stops[src.key]?.visit,
        leg: stops[src.key]?.leg,
        hasOriginal: !!src.originalKey,
      };
    }),
  );

  return NextResponse.json({ items, featuredKeys, ogKey });
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

  await deleteMoment(key);
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

  if (!(await objectExists(key))) {
    return NextResponse.json(
      { error: "The full-size file has not arrived yet. Rename it after it uploads." },
      { status: 409 },
    );
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
  purgeFeatured();

  return NextResponse.json({
    key: newKey,
    url: await signView(newKey),
    downloadUrl: await signDownload(newKey),
  });
}
