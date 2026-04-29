import fs from "node:fs";
import nodePath from "node:path";

const dataUrlCache = new Map<string, string>();
export function inlineAsset(publicRelativePath: string, mime: string): string {
  const cached = dataUrlCache.get(publicRelativePath);
  if (cached) return cached;
  const filePath = nodePath.join(process.cwd(), "public", publicRelativePath);
  const dataUrl = `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
  dataUrlCache.set(publicRelativePath, dataUrl);
  return dataUrl;
}

export function fontFace(family: string, weight: number, filename: string): string {
  const src = inlineAsset(`fonts/${filename}`, "font/woff2");
  return `@font-face { font-family: "${family}"; font-style: normal; font-weight: ${weight}; src: url("${src}") format('woff2'); }`;
}

export function fontHead(): string {
  return `<style>
    ${fontFace("Parkinsans", 500, "parkinsans-500.woff2")}
    ${fontFace("Parkinsans", 700, "parkinsans-700.woff2")}
    ${fontFace("Parkinsans", 800, "parkinsans-800.woff2")}
    ${fontFace("Fira Sans", 500, "fira-sans-500.woff2")}
    ${fontFace("Space Mono", 400, "space-mono-400.woff2")}
  </style>`;
}

export const OG_DIMS = { width: 480, height: 720 };

interface OgConfig {
  photo: string;
  photoMime?: string;
  photoPosition?: string;
  theme: string[];
  headline: string;
  subhead: string;
  details: string[];
  url: string;
}

export function ogHtml(cfg: OgConfig): string {
  const { width: W, height: H } = OG_DIMS;
  const photoSrc = inlineAsset(cfg.photo, cfg.photoMime ?? "image/jpeg");
  const lockupSrc = inlineAsset("lyrist-trademark-white.png", "image/png");
  const themeLines = cfg.theme.map((line) => `<div>${line}</div>`).join("");
  const detailLines = cfg.details.map((line) => `<div class="detail">${line}</div>`).join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
${fontHead()}
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #0a0a0a; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 0; }
  .poster { width: ${W}px; height: ${H}px; position: relative; overflow: hidden; font-family: "Parkinsans", sans-serif; background: #0a0a0a; }
  .poster-bg { position: absolute; top: 0; right: 0; width: 100%; height: 100%; object-fit: cover; object-position: ${cfg.photoPosition ?? "center"}; z-index: 1; }
  .noise { position: absolute; inset: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E"); z-index: 11; pointer-events: none; opacity: 0.4; }
  .photo-overlay { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(to right, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.65) 15%, rgba(10,10,10,0.22) 45%, transparent 70%); z-index: 3; }
  .bottom-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 45%; background: linear-gradient(to top, rgba(10,10,10,0.92) 0%, rgba(10,10,10,0.75) 30%, rgba(10,10,10,0.4) 60%, transparent 100%); z-index: 4; }
  .content { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; padding: 28px 32px; }
  .lockup { display: flex; align-items: center; gap: 4px; }
  .lockup-img { height: 26px; width: auto; }
  .lockup-records { font-family: "Fira Sans", sans-serif; font-size: 17px; font-weight: 500; color: #ffffff; }
  .theme { position: absolute; top: 28px; right: 32px; text-align: right; font-family: "Space Mono", monospace; font-size: 10px; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; color: #c0b8a8; line-height: 1.7; text-shadow: 0 0 8px rgba(0,0,0,0.6); }
  .title-block { margin-top: auto; margin-bottom: auto; }
  .headline { font-size: 116px; font-weight: 800; line-height: 0.88; letter-spacing: -0.015em; color: #f0ede6; text-transform: uppercase; margin-left: -3px; }
  .accent { width: 72px; height: 3px; background: linear-gradient(to right, #d4a553, #e8c474); margin: 14px 0 12px; }
  .subhead { font-family: "Space Mono", monospace; font-size: 12px; font-weight: 400; letter-spacing: 0.08em; text-transform: uppercase; color: #d4a553; line-height: 1.4; max-width: 320px; }
  .details-block { margin-top: auto; }
  .details-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
  .details-list { display: flex; flex-direction: column; gap: 4px; }
  .detail { font-family: "Space Mono", monospace; font-size: 11px; font-weight: 400; letter-spacing: 0.04em; color: #c0b8a8; line-height: 1.4; }
  .url { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; color: #f0ede6; white-space: nowrap; }
</style>
</head>
<body>
  <div class="poster">
    <img src="${photoSrc}" alt="" class="poster-bg" />
    <div class="photo-overlay"></div>
    <div class="bottom-overlay"></div>
    <div class="noise"></div>
    <div class="content">
      <div class="lockup">
        <img src="${lockupSrc}" alt="Lyrist" class="lockup-img" />
        <span class="lockup-records">Records</span>
      </div>
      <div class="theme">${themeLines}</div>
      <div class="title-block">
        <div class="headline">${cfg.headline}</div>
        <div class="accent"></div>
        <div class="subhead">${cfg.subhead}</div>
      </div>
      <div class="details-block">
        <div class="details-row">
          <div class="details-list">${detailLines}</div>
          <div class="url">${cfg.url}</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function homeOgHtml(): string {
  return ogHtml({
    photo: "images/home/bio.jpeg",
    photoPosition: "center 30%",
    theme: ["a rapper by", "microsoft engineer", "peyt spencer"],
    headline: `Peyt<br/>Spencer`,
    subhead: "Rap, code, and the path between",
    details: ["Bellevue, WA · Founder of Lyrist", "From The Ground Up Tour"],
    url: "peytspencer.com",
  });
}

export function listenOgHtml(latestTrack?: string): string {
  return ogHtml({
    photo: "images/home/atlanta.jpg",
    photoPosition: "center",
    theme: ["original singles", "stream now", "lyrist records"],
    headline: "Listen",
    subhead: latestTrack ? `Now streaming · ${latestTrack}` : "Hip-hop singles by Peyt Spencer",
    details: ["Patience · Safe · Right One", "So Good · Where I Wanna Be"],
    url: "peytspencer.com/listen",
  });
}

export function shopOgHtml(): string {
  return ogHtml({
    photo: "images/home/new-era-3-square.jpeg",
    photoMime: "image/jpeg",
    photoPosition: "center",
    theme: ["merch + music", "ships from bellevue", "lyrist records"],
    headline: "Shop",
    subhead: "Wear it. Stream it. Bundle it.",
    details: ["T-shirts · Singles · Full bundle", "New drops every season"],
    url: "peytspencer.com/shop",
  });
}

export function hireOgHtml(): string {
  return ogHtml({
    photo: "images/home/bio.jpeg",
    photoPosition: "center 25%",
    theme: ["available for", "engineering work", "bellevue, wa"],
    headline: "Hire",
    subhead: "Microsoft engineer · Founder of Lyrist",
    details: ["TypeScript · React · Next.js", "Supabase · Stripe · Postgres"],
    url: "peytspencer.com/hire",
  });
}

export function liveOgHtml(shows: Array<{ date: string; city: string; region: string }>): string {
  const cities = shows.slice(0, 3).map((s) => `${s.city}, ${s.region}`);
  const details =
    cities.length > 0
      ? cities.map((c, i) => (i === cities.length - 1 ? `${c} →` : c))
      : ["Coming to a city near you", "RSVP at peytspencer.com/rsvp"];
  return ogHtml({
    photo: "Jan23OpenMicNight-08_Original.jpg",
    photoPosition: "center",
    theme: ["from the ground up", "free admission", "lyrist records"],
    headline: "Live",
    subhead: "A rap concert · North American tour",
    details,
    url: "peytspencer.com/live",
  });
}

export function supportOgHtml(): string {
  return ogHtml({
    photo: "images/home/atlanta.jpg",
    photoPosition: "center 35%",
    theme: ["back the journey", "tip · subscribe", "stand with the artist"],
    headline: "Support",
    subhead: "Walk with me from the ground up",
    details: ["Tips · Monthly tiers", "Patron pack · Welcome track"],
    url: "peytspencer.com/support",
  });
}
