export async function adminSessionToken(): Promise<string | null> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return null;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`admin:${pw}`));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function isAdminAuthorized(request: Request): Promise<boolean> {
  const expected = await adminSessionToken();
  if (!expected) return false;
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)admin-auth=([^;]+)/);
  return !!match && decodeURIComponent(match[1]) === expected;
}
