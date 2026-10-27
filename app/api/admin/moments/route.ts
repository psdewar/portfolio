import { NextResponse, after } from "next/server";
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
  getDims,
  sanitizeFilename,
  deleteMomentArtifacts,
  renameMomentArtifacts,
  resolveCities,
  resolveStops,
  listMomentSources,
  objectExists,
  deleteMoment,
  queueProcessing,
} from "../../shared/moments";

const URL_TTL = 3600;
const BACKFILL_CAP = 6;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;

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

  const [sources, featuredKeys, thumbs, ogKey, dims] = await Promise.all([
    listMomentSources(),
    getFeatured(),
    getThumbs(),
    getOgKey(),
    getDims(),
  ]);
  sources.sort((a, b) => (a.lastModified?.getTime() || 0) - (b.lastModified?.getTime() || 0));
  const keys = sources.map((src) => src.key);
  const cities = await resolveCities(keys);
  const stops = await resolveStops(keys, cities);

  const items = await Promise.all(
    sources.map(async (src) => {
      const entry = thumbs[src.key];
      const sizes = [...(entry?.sizes ?? [])].sort((a, b) => a.w - b.w);
      const fallbackKey = entry?.key ?? src.previewKey;
      const thumbKey = sizes[0]?.key ?? fallbackKey;
      const largeKey = sizes[sizes.length - 1]?.key ?? fallbackKey;
      return {
        key: src.key,
        size: src.size,
        lastModified: src.lastModified?.toISOString() || null,
        url: await signView(src.viewKey),
        thumb: thumbKey ? await signView(thumbKey) : undefined,
        large: largeKey ? await signView(largeKey) : undefined,
        downloadUrl: await signDownload(src.viewKey, src.key),
        city: cities[src.key],
        visit: stops[src.key]?.visit,
        leg: stops[src.key]?.leg,
        hasOriginal: !!src.originalKey,
        dims: dims[src.key],
      };
    }),
  );

  const unthumbed = items
    .filter((it) => !it.thumb && !VIDEO_EXT.test(it.key))
    .map((it) => it.key);
  if (unthumbed.length) after(() => queueProcessing(unthumbed, BACKFILL_CAP));

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
