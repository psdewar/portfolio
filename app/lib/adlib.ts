export type AdlibRole = "host" | "viewer";

export interface AdlibIdentity {
  sub: string;
  name: string;
  role: AdlibRole;
  exp: number;
}

export interface AdlibMessage {
  id: number;
  ts: number;
  sub: string;
  name: string;
  role: AdlibRole;
  text: string;
}

export type AdlibErrorCode = "unauthorized" | "slow" | "too_long" | "empty" | "blocked" | "muted";

export interface AdlibError {
  code: AdlibErrorCode | string;
  message: string;
}

export interface AdlibFloatingReaction {
  key: string;
  emoji: string;
}

export const ADLIB_REACTIONS = ["🙏", "❤️", "🔥", "👏"] as const;

export const ADLIB_MESSAGE_MAX_LENGTH = 300;

export const ADLIB_ERROR_TEXT: Record<string, string> = {
  unauthorized: "sign in to chat",
  slow: "slow down a little",
  too_long: `${ADLIB_MESSAGE_MAX_LENGTH} characters max`,
  empty: "message is empty",
  blocked: "message not sent",
  muted: "you can't chat right now",
};

export function adlibErrorText(err: AdlibError): string {
  return ADLIB_ERROR_TEXT[err.code] || err.message || "something went wrong";
}

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4 === 0 ? "" : "=".repeat(4 - (base64.length % 4));
  const binary = atob(base64 + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function decodeAdlibToken(token: string): AdlibIdentity | null {
  const [payloadB64] = token.split(".");
  if (!payloadB64) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadB64)));
    if (
      typeof payload?.sub === "string" &&
      typeof payload?.name === "string" &&
      (payload?.role === "host" || payload?.role === "viewer") &&
      typeof payload?.exp === "number"
    ) {
      return payload as AdlibIdentity;
    }
  } catch {}
  return null;
}

function fnv1a(value: string): number {
  let seed = 2166136261 >>> 0;
  for (let i = 0; i < value.length; i++) {
    seed = Math.imul(seed ^ value.charCodeAt(i), 16777619) >>> 0;
  }
  return seed;
}

const NAME_COLORS = [
  "text-rose-500 dark:text-rose-400",
  "text-orange-500 dark:text-orange-400",
  "text-amber-600 dark:text-amber-400",
  "text-lime-600 dark:text-lime-400",
  "text-emerald-600 dark:text-emerald-400",
  "text-teal-600 dark:text-teal-400",
  "text-cyan-600 dark:text-cyan-400",
  "text-sky-500 dark:text-sky-400",
  "text-indigo-500 dark:text-indigo-400",
  "text-violet-500 dark:text-violet-400",
  "text-fuchsia-500 dark:text-fuchsia-400",
  "text-pink-500 dark:text-pink-400",
];

export function nameColorClass(sub: string): string {
  return NAME_COLORS[fnv1a(sub) % NAME_COLORS.length];
}
