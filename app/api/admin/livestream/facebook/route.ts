import { adminJson } from "../../../shared/admin-route";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { exchangeToken, getUserName } from "../../../../lib/facebook";

export function POST(request: Request) {
  return adminJson(request, async () => {
    const body = await request.json();
    const shortLived = String(body.token ?? "").trim();
    if (!shortLived) throw new Error("Access token is required");
    const { token, expiresIn } = await exchangeToken(shortLived);
    const userName = await getUserName(token);
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    const { error } = await supabaseAdmin.from("facebook_account").upsert({
      id: 1,
      access_token: token,
      user_name: userName,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
    return { userName, expiresAt };
  });
}

export function DELETE(request: Request) {
  return adminJson(request, async () => {
    const { error } = await supabaseAdmin.from("facebook_account").delete().eq("id", 1);
    if (error) throw error;
    return { ok: true };
  });
}
