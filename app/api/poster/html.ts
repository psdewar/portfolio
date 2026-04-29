import fs from "node:fs";
import nodePath from "node:path";
import { formatEventDate } from "../../lib/dates";

const dataUrlCache = new Map<string, string>();
function inlineAsset(publicRelativePath: string, mime: string): string {
  const cached = dataUrlCache.get(publicRelativePath);
  if (cached) return cached;
  const filePath = nodePath.join(process.cwd(), "public", publicRelativePath);
  const dataUrl = `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
  dataUrlCache.set(publicRelativePath, dataUrl);
  return dataUrl;
}

function fontFace(family: string, weight: number, filename: string): string {
  const src = inlineAsset(`fonts/${filename}`, "font/woff2");
  return `@font-face { font-family: "${family}"; font-style: normal; font-weight: ${weight}; src: url("${src}") format('woff2'); }`;
}

function fontHead(): string {
  return `<style>
    ${fontFace("Parkinsans", 500, "parkinsans-500.woff2")}
    ${fontFace("Parkinsans", 700, "parkinsans-700.woff2")}
    ${fontFace("Parkinsans", 800, "parkinsans-800.woff2")}
    ${fontFace("Fira Sans", 500, "fira-sans-500.woff2")}
    ${fontFace("Space Mono", 400, "space-mono-400.woff2")}
  </style>`;
}

export type PosterFormat = "standard" | "ig" | "yt" | "eb";

export const POSTER_DIMS: Record<PosterFormat, { W: number; H: number }> = {
  standard: { W: 480, H: 720 },
  ig: { W: 540, H: 675 },
  yt: { W: 540, H: 540 },
  eb: { W: 1080, H: 540 },
};

export function posterHtml(
  show: {
    date: string;
    venue: string | null;
    venueLabel?: string | null;
    doorLabel?: string | null;
    address: string | null;
    city: string;
    region: string;
    doorTime: string;
  },
  label?: string,
  format: PosterFormat = "standard",
): string {
  const { W, H } = POSTER_DIMS[format];
  const bgSrc = inlineAsset("Jan23OpenMicNight-08_Original.jpg", "image/jpeg");
  const lockupSrc = inlineAsset("lyrist-trademark-white.png", "image/png");
  const dateStr = formatEventDate(show.date);
  const cityRegion = `<span style="white-space:nowrap">${show.city}, ${show.region}</span>`;
  const location = show.venueLabel
    ? show.venueLabel
    : `${show.venue || show.address ? `${show.venue || show.address}, ` : ""}${cityRegion}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  ${fontHead()}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #111; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 0; }
    .poster { width: ${W}px; height: ${H}px; position: relative; overflow: hidden; font-family: "Parkinsans", sans-serif; background: #0a0a0a; }
    .poster-bg { position: absolute; top: 0; right: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 1; }
    .poster::before { content: ""; position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); z-index: 11; pointer-events: none; opacity: 0.4; }
    .photo-overlay { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(to right, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.65) 15%, rgba(10,10,10,0.22) 45%, transparent 70%); z-index: 3; }
    .bottom-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 40%; background: linear-gradient(to top, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.75) 25%, rgba(10,10,10,0.4) 55%, transparent 100%); z-index: 4; }
    .content { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; padding: 24px 28px; }
    .lockup { display: flex; align-items: center; gap: 3px; margin-bottom: 4px; }
    .lockup-img { height: 22px; width: auto; }
    .lockup-records { font-family: "Fira Sans", sans-serif; font-size: 15px; font-weight: 500; color: #ffffff; margin-bottom: 1px; }
    .presents { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #e0b860; margin-bottom: 8px; margin-top: 8px; }
    .title-block { margin-bottom: auto; }
    .title-from { font-size: 26px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #d4a553; line-height: 0.9; }
    .title-big { font-size: 72px; font-weight: 800; line-height: 0.9; letter-spacing: -0.01em; color: #f0ede6; text-transform: uppercase; margin-left: -2px; }
    .title-accent { width: 64px; height: 3px; background: linear-gradient(to right, #d4a553, #e8c474); margin: 6px 0 7px; }
    .the-concert { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #e0b860; }
    .theme-topright { position: absolute; top: 24px; right: 28px; text-align: right; font-family: "Space Mono", monospace; font-size: 9px; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; color: #c0b8a8; line-height: 1.6; text-shadow: 0 0 8px rgba(0,0,0,0.6); }
    .details { margin-top: auto; width: 100%; }
    .bottom-row { display: flex; justify-content: space-between; align-items: flex-start; }
    .bottom-left { display: flex; flex-direction: column; gap: 10px; }
    .tags { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #e0b860; line-height: 1; }
    .detail-value { font-size: 14px; font-weight: 500; color: #c0b8a8; letter-spacing: 0.02em; }
    .detail-value.date { font-size: 20px; font-weight: 700; color: #f0ede6; }
    .qr-section { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
    .qr-code { width: 92px; height: 92px; }
    .qr-label { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #c0b8a8; text-align: center; line-height: 1; }
    ${format === "ig" ? ".title-from { font-size: 24px; } .title-big { font-size: 66px; }" : ""}
    ${format === "yt" ? ".title-from { font-size: 19.5px; } .title-big { font-size: 54px; } .detail-value.date { font-size: 16px; } .detail-value { font-size: 12px; } .qr-code { width: 72px; height: 72px; }" : ""}
    ${format === "eb" ? ".poster-bg { object-position: center 37.5%; } .bottom-overlay { display: none; } .details { display: none; } .content { padding: 36px 42px; } .lockup-img { height: 33px; } .lockup-records { font-size: 22.5px; margin-bottom: 1.5px; } .presents { font-size: 15px; margin-bottom: 12px; margin-top: 12px; } .title-from { font-size: 39px; } .title-big { font-size: 108px; } .title-accent { width: 96px; height: 4.5px; margin: 9px 0 10.5px; } .the-concert { font-size: 15px; } .theme-topright { font-size: 13.5px; top: 36px; right: 42px; }" : ""}
  </style>
</head>
<body>
  <div class="poster">
    <img src="${bgSrc}" alt="" class="poster-bg" />
    <div class="photo-overlay"></div>
    <div class="bottom-overlay"></div>
    <div class="content">
      <div class="theme-topright">
        <div>a rap concert by</div>
        <div>microsoft engineer</div>
        <div>peyt spencer</div>
      </div>
      <div class="lockup">
        <img src="${lockupSrc}" alt="Lyrist" class="lockup-img" />
        <span class="lockup-records">Records</span>
      </div>
      <div class="presents">presents</div>
      <div class="title-block">
        <div class="title-from">From The</div>
        <div class="title-big">Ground</div>
        <div class="title-big" style="margin-bottom:0">Up</div>
        <div class="title-accent"></div>
        <div class="the-concert">my path of growth</div>
        <div class="the-concert">and the principles</div>
        <div class="the-concert">that connect us${label ? ` ${label.split(" ")[0]}` : ""}</div>${label ? `\n        <div class="the-concert">${label.split(" ").slice(1).join(" ")}</div>` : ""}
      </div>
      <div class="details">
        <div class="bottom-row">
          <div class="bottom-left">
            <div class="tags">Free Admission</div>
            <div class="detail-value date">${dateStr}</div>
            <div class="detail-value">${location}</div>
            <div class="detail-value">${show.doorLabel || `Doors open at ${show.doorTime}`}</div>
          </div>
          <div class="qr-section">
            <div class="qr-label">peytspencer.com/rsvp</div>
            <img src="https://assets.peytspencer.com/images/rsvp-qr-s10.png" alt="QR Code" class="qr-code" />
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
