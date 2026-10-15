import { adminJson } from "../../../shared/admin-route";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import {
  SOCIAL_KINDS,
  SOCIAL_PLATFORMS,
  parseSocialInput,
  type SocialKind,
  type SocialPlatform,
} from "../../../../lib/social-destinations";

function parseTarget(platform: unknown, kind: unknown) {
  if (!SOCIAL_PLATFORMS.includes(platform as SocialPlatform)) throw new Error("Invalid platform");
  if (!SOCIAL_KINDS.includes(kind as SocialKind)) throw new Error("Invalid destination");
  return { platform: platform as SocialPlatform, kind: kind as SocialKind };
}

export function POST(request: Request) {
  return adminJson(request, async () => {
    const body = await request.json();
    const { platform, kind } = parseTarget(body.platform, body.kind);
    const { streamUrl, streamKey } = parseSocialInput(platform, body);
    const savedAt = new Date().toISOString();
    const { error } = await supabaseAdmin.from("social_destinations").upsert({
      platform,
      kind,
      stream_url: streamUrl,
      stream_key: streamKey,
      updated_at: savedAt,
    });
    if (error) throw error;
    return { savedAt };
  });
}

export function DELETE(request: Request) {
  return adminJson(request, async () => {
    const params = new URL(request.url).searchParams;
    const { platform, kind } = parseTarget(params.get("platform"), params.get("kind"));
    const { error } = await supabaseAdmin
      .from("social_destinations")
      .delete()
      .eq("platform", platform)
      .eq("kind", kind);
    if (error) throw error;
    return { ok: true };
  });
}
