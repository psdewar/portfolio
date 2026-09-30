import { adminJson } from "../../../shared/admin-route";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

const PRIVACY = ["public", "unlisted", "private"];

export function POST(request: Request) {
  return adminJson(request, async () => {
    const body = await request.json();
    if (body.privacy !== undefined && !PRIVACY.includes(body.privacy)) throw new Error("Invalid privacy");
    const update: Record<string, boolean | string> = {};
    for (const [key, column] of [
      ["embeddable", "embeddable"],
      ["dvr", "dvr"],
      ["madeForKids", "made_for_kids"],
    ] as const) {
      if (body[key] === undefined) continue;
      if (typeof body[key] !== "boolean") throw new Error(`Invalid ${key}`);
      update[column] = body[key];
    }
    if (body.privacy !== undefined) update.privacy = body.privacy;
    if (Object.keys(update).length === 0) throw new Error("Nothing to update");
    const { error } = await supabaseAdmin
      .from("livestream_settings")
      .update({ ...update, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) throw error;
    return { ok: true };
  });
}
