import { adminJson } from "../../shared/admin-route";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import {
  getAdminState,
  syncBroadcast,
  THUMBNAIL_MAX_BYTES,
  THUMBNAIL_PATH,
} from "../../../lib/livestream";

const PRIVACY = ["public", "unlisted", "private"];
const THUMBNAIL_TYPES = ["image/jpeg", "image/png"];

function parseThumbnail(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png));base64,(.+)$/);
  if (!match || !THUMBNAIL_TYPES.includes(match[1])) throw new Error("Thumbnail must be a JPG or PNG");
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length > THUMBNAIL_MAX_BYTES) throw new Error("Thumbnail must be under 2 MB");
  return { type: match[1], bytes };
}

export function GET(request: Request) {
  return adminJson(request, getAdminState);
}

export function POST(request: Request) {
  return adminJson(request, async () => {
    const body = await request.json();
    if (body.privacy !== undefined && !PRIVACY.includes(body.privacy)) throw new Error("Invalid privacy");
    const thumbnail = body.thumbnail ? parseThumbnail(body.thumbnail) : null;

    if (thumbnail) {
      const { error } = await supabaseAdmin.storage
        .from("livestream")
        .upload(THUMBNAIL_PATH, thumbnail.bytes, { contentType: thumbnail.type, upsert: true });
      if (error) throw error;
    }

    const { error } = await supabaseAdmin
      .from("livestream_settings")
      .update({
        title: String(body.title ?? ""),
        description: String(body.description ?? ""),
        ...(body.privacy !== undefined ? { privacy: body.privacy } : {}),
        notify_subscribers: !!body.notify,
        ...(thumbnail ? { thumbnail_path: THUMBNAIL_PATH, thumbnail_type: thumbnail.type } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (error) throw error;

    const connected = await supabaseAdmin
      .from("youtube_accounts")
      .select("account")
      .eq("account", "main")
      .maybeSingle();
    if (connected.error) throw connected.error;
    if (!connected.data) return { youtube: false };

    await syncBroadcast("main", {
      update: true,
      scheduledStart: body.nextStream,
      thumbnail: !!thumbnail,
    });
    return { youtube: true };
  });
}
