import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { readSession } from "../../../../lib/session";

const TOKEN_TTL_SECONDS = 12 * 60 * 60;

export async function POST(request: Request) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  if (!session.name.trim()) {
    return NextResponse.json({ error: "needs_name" }, { status: 403 });
  }

  const secret = process.env.ADLIB_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Adlib not configured" }, { status: 500 });
  }

  const email = session.email.trim().toLowerCase();
  const hostEmail = (process.env.ADLIB_HOST_EMAIL || "").trim().toLowerCase();

  const sub = createHmac("sha256", secret).update(email).digest("hex").slice(0, 16);
  const role = hostEmail && email === hostEmail ? "host" : "viewer";
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;

  const payload = { sub, name: role === "host" ? "Peyt S." : session.name, role, exp };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(payloadB64).digest("base64url");

  return NextResponse.json({ token: `${payloadB64}.${sig}` });
}
