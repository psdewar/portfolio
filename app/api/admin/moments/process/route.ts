import { NextResponse } from "next/server";
import { s3, s3Bucket } from "../../../shared/s3";
import { isAdminAuthorized } from "../../../shared/admin-auth";
import {
  ensureProcessed,
  getFeatured,
  purgeFeatured,
} from "../../../shared/moments";

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json(
      { error: "Upload storage is not configured." },
      { status: 503 },
    );
  }

  const { key } = (await request.json().catch(() => ({}))) as { key?: string };
  if (!key || !key.startsWith("drops/")) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  const { missing } = await ensureProcessed([key]);
  if (!missing.length && (await getFeatured()).includes(key)) purgeFeatured();
  return NextResponse.json({ ok: true, thumb: !missing.length });
}
