import qrcode from "qrcode-generator";
import fs from "fs";
import path from "path";
import { isAllowedQrPath } from "./qr-paths";

const SITE_URL = "https://peytspencer.com";
const INK = "#0a0a0a";
const QR_BORDER = 4;
const BOX = 16;
const PHOTO_RING = 0.3;
const PHOTO_SCALE = 0.38;

const TILE = "support";
type Qr = ReturnType<typeof qrcode>;

type TileLayout = {
  left: number;
  size: number;
  cleared: boolean[];
};

function sanitize(path: string): string {
  return isAllowedQrPath(path) ? path : "/rsvp";
}

function tileFile(): string {
  return path.join(
    process.cwd(),
    "public",
    "images",
    "printouts",
    `${TILE}.jpg`,
  );
}

function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
}

function tileVersion(): number {
  return fs.statSync(tileFile()).mtimeMs;
}

const tileDataUriCache = new Map<string, string>();

function loadTileDataUri(): string {
  const key = String(tileVersion());
  const cached = tileDataUriCache.get(key);
  if (cached) return cached;
  const dataUri = `data:image/jpeg;base64,${fs.readFileSync(tileFile()).toString("base64")}`;
  tileDataUriCache.set(key, dataUri);
  return dataUri;
}

function tileLayout(n: number): TileLayout {
  const qrPx = (n + 2 * QR_BORDER) * BOX;
  const size = 2 * Math.round(roundHalfEven(PHOTO_SCALE * n * BOX) / 2);
  const left = (qrPx - size) / 2;
  const center = qrPx / 2;
  const reach = size / 2 + PHOTO_RING * BOX;
  const cleared = new Array<boolean>(n * n).fill(false);
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      const x0 = (col + QR_BORDER) * BOX;
      const y0 = (row + QR_BORDER) * BOX;
      const nx = Math.max(x0 - center, 0, center - (x0 + BOX));
      const ny = Math.max(y0 - center, 0, center - (y0 + BOX));
      cleared[row * n + col] = nx * nx + ny * ny < reach * reach;
    }
  }
  return { left, size, cleared };
}

function makeQr(path: string, level: "M" | "H"): Qr {
  const qr = qrcode(0, level);
  qr.addData(`${SITE_URL}${sanitize(path)}`);
  qr.make();
  return qr;
}

function plainSvg(qr: Qr): string {
  const createSvgTag = qr.createSvgTag as (opts: {
    margin?: number;
    scalable?: boolean;
  }) => string;
  return createSvgTag({ margin: QR_BORDER, scalable: true });
}

function tiledSvg(qr: Qr): string {
  const n = qr.getModuleCount();
  const viewSize = n + QR_BORDER * 2;
  const layout = tileLayout(n);

  let rects = "";
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!qr.isDark(row, col) || layout.cleared[row * n + col]) continue;
      rects += `<rect x="${QR_BORDER + col}" y="${QR_BORDER + row}" width="1" height="1" fill="${INK}"/>`;
    }
  }

  const x = layout.left / BOX;
  const y = layout.left / BOX;
  const w = layout.size / BOX;
  const cx = x + w / 2;
  const cy = y + w / 2;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewSize} ${viewSize}" shape-rendering="crispEdges">` +
    `<rect x="0" y="0" width="${viewSize}" height="${viewSize}" fill="#ffffff"/>` +
    rects +
    `<defs><clipPath id="qr-face-clip"><circle cx="${cx}" cy="${cy}" r="${w / 2}"/></clipPath></defs>` +
    `<image x="${x}" y="${y}" width="${w}" height="${w}" href="${loadTileDataUri()}" preserveAspectRatio="none" clip-path="url(#qr-face-clip)"/>` +
    `</svg>`
  );
}

export function qrSvg(path: string, tile?: string): string {
  if (tile === TILE) {
    return tiledSvg(makeQr(path, "H"));
  }
  return plainSvg(makeQr(path, "M"));
}

export function qrDataUrl(path: string): string {
  return `data:image/svg+xml,${encodeURIComponent(plainSvg(makeQr(path, "M")))}`;
}
