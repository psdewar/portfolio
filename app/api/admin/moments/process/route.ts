import { NextResponse } from "next/server";
import { s3, s3Bucket } from "../../../shared/s3";
import { isAdminAuthorized } from "../../../shared/admin-auth";
import {
  generateThumb,
  recordThumbs,
  probeImageDims,
  recordDims,
  getFeatured,
  purgeFeatured,
} from "../../../shared/moments";

export const maxDuration = 60;

const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;

export async function POST(request: Request) {
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

  const [thumb, dims] = await Promise.all([
    generateThumb(key).catch(() => null),
    IMAGE_EXT.test(key) ? probeImageDims(key) : Promise.resolve(null),
  ]);
  if (thumb) await recordThumbs({ [key]: thumb });
  if (dims) await recordDims({ [key]: dims });
  // A fresh upload is not in the slideshow yet, so it does not purge; only a
  // full-quality file landing for an already-featured key changes the payload.
  if ((thumb || dims) && (await getFeatured()).includes(key)) {
    purgeFeatured();
  }

  return NextResponse.json({ ok: true, thumb: Boolean(thumb) });
}
