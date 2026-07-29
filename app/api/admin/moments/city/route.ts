import { NextResponse } from "next/server";
import { s3, s3Bucket } from "../../../shared/s3";
import { isAdminAuthorized } from "../../../shared/admin-auth";
import { setCity } from "../../../shared/moments";

export async function POST(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }

  const { key, city } = (await request.json().catch(() => ({}))) as {
    key?: string;
    city?: string | null;
  };
  if (!key || !key.startsWith("drops/")) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  const trimmed = typeof city === "string" ? city.trim().slice(0, 80) : "";
  await setCity(key, trimmed || null);
  return NextResponse.json({ ok: true, city: trimmed || null });
}
