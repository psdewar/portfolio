import "server-only";
import { cookies } from "next/headers";
import { roleForToken } from "../api/shared/admin-auth";
import { canAccess, type AdminRole } from "./admin-roles";

export async function getAdminRole(): Promise<AdminRole | null> {
  const jar = await cookies();
  return roleForToken(jar.get("admin-auth")?.value);
}

export async function requireAdminPage(pathname: string): Promise<AdminRole | null> {
  const role = await getAdminRole();
  return role && canAccess(role, pathname) ? role : null;
}
