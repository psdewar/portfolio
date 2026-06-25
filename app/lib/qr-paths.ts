export const ALLOWED_QR_PREFIXES = ["/rsvp", "/support", "/shop", "/ticket", "/fund"];

export function isAllowedQrPath(path: string): boolean {
  if (path.includes("..")) return false;
  return ALLOWED_QR_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`));
}
