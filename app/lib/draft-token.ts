import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.DRAFT_TOKEN_SECRET;

function sign(showId: string, secret: string): string {
  return createHmac("sha256", secret).update(showId).digest("base64url").slice(0, 32);
}

export function signDraftToken(showId: string): string {
  if (!SECRET) throw new Error("DRAFT_TOKEN_SECRET not set");
  return sign(showId, SECRET);
}

export function verifyDraftToken(showId: string, token: string): boolean {
  if (!SECRET || !showId || !token) return false;
  const expected = sign(showId, SECRET);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function buildMagicLink(origin: string, showId: string): string {
  const token = signDraftToken(showId);
  return `${origin}/sponsor/host?draft=${encodeURIComponent(showId)}&t=${token}`;
}
