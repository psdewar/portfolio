import { supabaseAdmin } from "../../../lib/supabase-admin";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { isCheckinId } from "./checkin-metadata";
import { s3, s3Bucket } from "./s3";
import { previewKeyFor } from "./moments";
import { isAdminAuthorized } from "./admin-auth";

export const CHECKIN_PASSCODE_PREFIX = "checkin:";

export function checkinIdFromPasscode(passcode: unknown): string | null {
  if (typeof passcode !== "string" || !passcode.startsWith(CHECKIN_PASSCODE_PREFIX)) return null;
  const id = passcode.slice(CHECKIN_PASSCODE_PREFIX.length);
  return isCheckinId(id) ? id : null;
}

export async function isMomentsAuthorized(passcode: unknown): Promise<boolean> {
  if (typeof passcode !== "string" || !passcode) return false;
  if (passcode === process.env.MOMENTS_PASSCODE) return true;
  if (!passcode.startsWith(CHECKIN_PASSCODE_PREFIX)) return false;
  const id = passcode.slice(CHECKIN_PASSCODE_PREFIX.length);
  if (!isCheckinId(id)) return false;
  const { data } = await supabaseAdmin
    .from("attendances")
    .select("id")
    .eq("public_id", id)
    .maybeSingle();
  return !!data;
}

export async function isUploadAuthorized(request: Request, passcode: unknown): Promise<boolean> {
  return (await isMomentsAuthorized(passcode)) || (await isAdminAuthorized(request));
}

export async function canDeleteMoment(passcode: unknown, key: string): Promise<boolean> {
  if (typeof passcode !== "string" || !s3 || !s3Bucket) return false;
  if (passcode === process.env.MOMENTS_PASSCODE) return true;
  const id = checkinIdFromPasscode(passcode);
  if (!id) return false;
  for (const source of [key, previewKeyFor(key)]) {
    try {
      const head = await s3.send(new HeadObjectCommand({ Bucket: s3Bucket, Key: source }));
      return head.Metadata?.checkinid?.toLowerCase() === id.toLowerCase();
    } catch {}
  }
  return false;
}
