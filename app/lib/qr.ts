import qrcode from "qrcode-generator";
import { isAllowedQrPath } from "./qr-paths";

const SITE_URL = "https://peytspencer.com";

function sanitize(path: string): string {
  return isAllowedQrPath(path) ? path : "/rsvp";
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
