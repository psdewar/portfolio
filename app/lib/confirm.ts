import { createHmac, timingSafeEqual } from "crypto";

// Signs a show slug so a sponsor can confirm it via a link without any login or
// stored token. The secret never leaves the server; the sponsor only ever holds
// slug + signature. Falls back to the chorus token so no new env is required.
const SECRET = process.env.CONFIRM_SECRET || process.env.SCHEDULE_API_TOKEN || "";

export function signSlug(slug: string): string {
  return createHmac("sha256", SECRET).update(slug).digest("hex").slice(0, 32);
}

export function verifySlug(slug: string, sig: string | undefined): boolean {
  if (!sig || !SECRET) return false;
  const expected = signSlug(slug);
  if (sig.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function confirmPath(slug: string): string {
  return `/sponsor/confirm/${slug}?sig=${signSlug(slug)}`;
}
