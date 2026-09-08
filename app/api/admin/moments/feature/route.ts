import { NextResponse } from "next/server";
import { s3, s3Bucket } from "../../../shared/s3";
import { isAdminAuthorized } from "../../../shared/admin-auth";
import {
  getFeatured,
  setFeatured,
  purgeFeatured,
  ensureProcessed,
  getThumbs,
  signView,
} from "../../../shared/moments";

export async function POST(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }

  const { key, featured, after } = (await request.json().catch(() => ({}))) as {
    key?: string;
    featured?: boolean;
    after?: string;
  };
  if (!key || !key.startsWith("drops/")) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  let thumb: string | undefined;
  if (featured) {
    const { missing } = await ensureProcessed([key]);
    if (missing.length) {
      return NextResponse.json({ error: "Could not add to slideshow." }, { status: 500 });
    }
    const entry = (await getThumbs())[key];
    thumb = entry ? await signView(entry.key) : undefined;
  }

  const current = await getFeatured();
  let next: string[];
  if (featured) {
    if (current.includes(key)) {
      next = current;
    } else {
      const at = after ? current.indexOf(after) : -1;
      next = [...current];
      next.splice(at >= 0 ? at + 1 : next.length, 0, key);
    }
  } else {
    next = current.filter((k) => k !== key);
  }
  await setFeatured(next);
  purgeFeatured();

  return NextResponse.json({ keys: next, thumb });
}

export async function PUT(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }

  const { keys } = (await request.json().catch(() => ({}))) as { keys?: unknown };
  if (
    !Array.isArray(keys) ||
    !keys.every((k) => typeof k === "string" && k.startsWith("drops/"))
  ) {
    return NextResponse.json({ error: "Invalid keys." }, { status: 400 });
  }

  const current = await getFeatured();
  const added = (keys as string[]).filter((k) => !current.includes(k));
  if (added.length) {
    const { missing } = await ensureProcessed(added.slice(0, 3));
    if (missing.length) {
      return NextResponse.json({ error: "Could not add to slideshow." }, { status: 500 });
    }
  }
  await setFeatured(keys as string[]);
  purgeFeatured();
  return NextResponse.json({ featured: keys });
}
