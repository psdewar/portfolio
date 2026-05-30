import qrcode from "qrcode-generator";

const SITE_URL = "https://peytspencer.com";
const ALLOWED_PREFIXES = ["/rsvp", "/support", "/shop"];

function sanitize(path: string): string {
  if (path.includes("..")) return "/rsvp";
  return ALLOWED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`)) ? path : "/rsvp";
}

export function qrSvg(path: string): string {
  const qr = qrcode(0, "M");
  qr.addData(`${SITE_URL}${sanitize(path)}`);
  qr.make();
  const createSvgTag = qr.createSvgTag as (opts: { margin?: number; scalable?: boolean }) => string;
  return createSvgTag({ margin: 4, scalable: true });
}

export function qrDataUrl(path: string): string {
  return `data:image/svg+xml,${encodeURIComponent(qrSvg(path))}`;
}
