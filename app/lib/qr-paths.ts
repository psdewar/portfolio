export const ALLOWED_QR_PREFIXES = ["/rsvp", "/support", "/shop", "/ticket", "/checkin", "/fund"];

export function isAllowedQrPath(path: string): boolean {
  if (path.includes("..")) return false;
  const base = path.split("?")[0];
  return ALLOWED_QR_PREFIXES.some((p) => base === p || base.startsWith(`${p}/`));
}
