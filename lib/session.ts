import { createHmac, timingSafeEqual } from "crypto";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "ps_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 180;

export interface SessionPayload {
  email: string;
  name: string;
  iat: number;
  exp: number;
}

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set");
  return secret;
}

function sign(data: string): string {
  return createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function createSessionToken(payload: { email: string; name: string }): string {
  const iat = Math.floor(Date.now() / 1000);
  const body: SessionPayload = {
    email: payload.email,
    name: payload.name,
    iat,
    exp: iat + SESSION_MAX_AGE,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifySessionToken(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot < 0) return null;
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(encoded);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number" ||
      payload.exp * 1000 <= Date.now()
    ) {
      return null;
    }
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

export function readSessionCookie(request: Request): string | null {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)ps_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function readSession(request: Request): SessionPayload | null {
  return verifySessionToken(readSessionCookie(request));
}

export function setSessionCookie(
  response: NextResponse,
  payload: { email: string; name: string },
): NextResponse {
  response.cookies.set(SESSION_COOKIE, createSessionToken(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
