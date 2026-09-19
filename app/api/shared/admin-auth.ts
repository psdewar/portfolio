import type { AdminRole } from "../../lib/admin-roles";

const ROLE_PREFIX: Record<AdminRole, string> = { owner: "admin", agent: "agent" };

function rolePassword(role: AdminRole): string | undefined {
  return role === "owner" ? process.env.ADMIN_PASSWORD : process.env.ADMIN_AGENT_PASSWORD;
}

export async function adminSessionToken(role: AdminRole = "owner"): Promise<string | null> {
  const pw = rolePassword(role);
  if (!pw) return null;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${ROLE_PREFIX[role]}:${pw}`)
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function roleForPassword(password: string): AdminRole | null {
  if (!password) return null;
  if (password === rolePassword("owner")) return "owner";
  if (password === rolePassword("agent")) return "agent";
  return null;
}

export async function roleForToken(token: string | undefined): Promise<AdminRole | null> {
  if (!token) return null;
  for (const role of ["owner", "agent"] as const) {
    const expected = await adminSessionToken(role);
    if (expected && token === expected) return role;
  }
  return null;
}

export async function isAdminAuthorized(request: Request): Promise<boolean> {
  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)admin-auth=([^;]+)/);
  return !!(await roleForToken(match ? decodeURIComponent(match[1]) : undefined));
}
