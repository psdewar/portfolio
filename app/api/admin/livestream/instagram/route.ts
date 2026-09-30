import { adminJson } from "../../../shared/admin-route";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { INSTAGRAM_KINDS, type InstagramKind } from "../../../../lib/livestream";

function parseKind(value: unknown): InstagramKind {
  if (!INSTAGRAM_KINDS.includes(value as InstagramKind)) throw new Error("Invalid destination");
  return value as InstagramKind;
}

export function POST(request: Request) {
  return adminJson(request, async () => {
    const body = await request.json();
    const kind = parseKind(body.kind);
    const url = String(body.url ?? "").trim();
    const key = String(body.key ?? "").trim();
    if (!/^rtmps?:\/\//.test(url)) throw new Error("Stream URL must start with rtmps://");
    if (!key) throw new Error("Stream key is required");
    const savedAt = new Date().toISOString();
    const { error } = await supabaseAdmin
      .from("instagram_destinations")
      .upsert({ kind, stream_url: url, stream_key: key, saved_at: savedAt });
    if (error) throw error;
    return { savedAt };
  });
}

export function DELETE(request: Request) {
  return adminJson(request, async () => {
    const kind = parseKind(new URL(request.url).searchParams.get("kind"));
    const { error } = await supabaseAdmin.from("instagram_destinations").delete().eq("kind", kind);
    if (error) throw error;
    return { ok: true };
  });
}
