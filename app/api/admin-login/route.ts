import { NextRequest, NextResponse } from "next/server";
import { adminSessionToken } from "../shared/admin-auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const token = await adminSessionToken();
  if (!token || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin-auth", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin-auth", "", { path: "/", maxAge: 0 });
  return res;
}
