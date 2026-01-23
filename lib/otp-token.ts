import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  randomInt,
  createHash,
  timingSafeEqual,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

interface OtpPayload {
  email: string;
  code: string;
  firstName: string;
  phone?: string;
  tier?: string;
  expiresAt: number;
}

function getEncryptionKey(): Buffer {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }
  // Hash the secret to get a consistent 32-byte key
  return createHash("sha256").update(secret).digest();
}

export function createOtpToken(payload: OtpPayload): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const json = JSON.stringify(payload);
  const encrypted = Buffer.concat([
    cipher.update(json, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine: iv + authTag + encrypted
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString("base64url");
}

export function verifyOtpToken(token: string): OtpPayload | null {
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(token, "base64url");

    // Extract parts
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    const payload: OtpPayload = JSON.parse(decrypted.toString("utf8"));

    // Check expiry
    if (Date.now() > payload.expiresAt) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function generateOtpCode(): string {
  // Use cryptographically secure random number (1000-9999)
  return randomInt(1000, 10000).toString();
}

export function verifyOtpCodeSafe(expected: string, actual: string): boolean {
  // Normalize and pad to same length for timing-safe comparison
  const a = Buffer.from(expected.padEnd(8, "\0"));
  const b = Buffer.from(actual.padEnd(8, "\0"));
  return timingSafeEqual(a, b);
}
