import { timingSafeEqual } from "crypto";

export function isRelayAuthorized(header: string | null): boolean {
  const token = process.env.LIVE_RELAY_TOKEN;
  if (!token) throw new Error("LIVE_RELAY_TOKEN is not set");
  const provided = Buffer.from(header?.replace(/^Bearer /, "") ?? "");
  const expected = Buffer.from(token);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}
