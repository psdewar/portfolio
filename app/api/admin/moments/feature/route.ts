import { NextResponse, after } from "next/server";
import { s3, s3Bucket } from "../../../shared/s3";
import { isAdminAuthorized } from "../../../shared/admin-auth";
import {
  getFeatured,
  setFeatured,
  purgeFeatured,
  queueProcessing,
} from "../../../shared/moments";

function processAfterResponse(keys: string[]) {
  if (!keys.length) return;
  after(() => queueProcessing(keys));
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
  await setFeatured(keys as string[]);
  purgeFeatured();
  processAfterResponse(added);
  return NextResponse.json({ featured: keys });
}
