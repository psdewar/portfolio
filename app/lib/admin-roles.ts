export type AdminRole = "owner" | "agent";

const AGENT_PATHS = [
  "/admin/hosts",
  "/admin/invite",
  "/admin/printouts",
  "/api/admin/import-eventbrite",
];

export function canAccess(role: AdminRole, pathname: string, method = "GET"): boolean {
  if (role === "owner") return true;
  if (method === "DELETE") return false;
  return (
    pathname === "/admin" ||
    AGENT_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}
