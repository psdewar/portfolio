import { NextResponse } from "next/server";
import { s3, s3Bucket } from "../../../shared/s3";
import { isAdminAuthorized } from "../../../shared/admin-auth";
import { getFeatured, setFeatured } from "../../../shared/moments";

export async function POST(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }

  const { key, featured } = (await request.json().catch(() => ({}))) as {
    key?: string;
    featured?: boolean;
  };
  if (!key || !key.startsWith("drops/")) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  const current = await getFeatured();
  let next: string[];
  if (featured) {
    next = current.includes(key) ? current : [...current, key];
  } else {
    next = current.filter((k) => k !== key);
  }
  await setFeatured(next);

  return NextResponse.json({ featured: Boolean(featured) });
}
