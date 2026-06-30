import { NextResponse } from "next/server";
import { s3, s3Bucket } from "../../../shared/s3";
import { isAdminAuthorized } from "../../../shared/admin-auth";
import { setOgKey } from "../../../shared/moments";

export async function POST(request: Request) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!s3 || !s3Bucket) {
    return NextResponse.json({ error: "Upload storage is not configured." }, { status: 503 });
  }

  const { key } = (await request.json().catch(() => ({}))) as { key?: string | null };
  if (key !== null && (typeof key !== "string" || !key.startsWith("drops/"))) {
    return NextResponse.json({ error: "Invalid key." }, { status: 400 });
  }

  await setOgKey(key);
  return NextResponse.json({ ogKey: key });
}
