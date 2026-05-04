export const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "peyt2024";

export function isAdminAuthorized(request: Request): boolean {
  return request.headers.get("x-admin-password") === ADMIN_PASSWORD;
}
