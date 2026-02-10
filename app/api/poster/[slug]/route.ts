import { NextRequest } from "next/server";
import { getShowBySlug } from "../../../lib/shows";
import { formatEventDate } from "../../../lib/dates";
import { takeScreenshot } from "../../../lib/screenshot";

const BASE_URL = process.env.OG_BASE_URL || "https://peytspencer.com";

function posterHtml(show: {
  date: string;
  venue: string | null;
  address: string | null;
  city: string;
  region: string;
  doorTime: string;
}): string {
  const dateStr = formatEventDate(show.date);
  const cityRegion = `<span style="white-space:nowrap">${show.city}, ${show.region}</span>`;
  const location = show.venue || show.address
    ? `${show.venue || show.address}, ${cityRegion}`
    : cityRegion;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600&family=Parkinsans:wght@400;500;600;700;800&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #111; display: flex; justify-content: center; align-items: flex-start; min-height: 100vh; padding: 0; }
    .poster { width: 480px; height: 720px; position: relative; overflow: hidden; font-family: "Parkinsans", sans-serif; background: #0a0a0a; }
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
  </style>
</head>
<body>
  <div class="poster">
    <img src="${BASE_URL}/Jan23OpenMicNight-08_Original.jpg" alt="" class="poster-bg" />
    <div class="photo-overlay"></div>
    <div class="bottom-overlay"></div>
    <div class="content">
      <div class="theme-topright">
        <div>a rap concert by</div>
        <div>microsoft engineer</div>
        <div>peyt spencer</div>
      </div>
      <div class="lockup">
        <img src="${BASE_URL}/lyrist-trademark-white.png" alt="Lyrist" class="lockup-img" />
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
        <div class="the-concert">that connect us</div>
      </div>
      <div class="details">
        <div class="bottom-row">
          <div class="bottom-left">
            <div class="tags">Free Admission</div>
            <div class="detail-value date">${dateStr}</div>
            <div class="detail-value">${location}</div>
            <div class="detail-value">Doors open at ${show.doorTime}</div>
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

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const show = await getShowBySlug(slug);

  if (!show) {
    return new Response("Show not found", { status: 404 });
  }

  const html = posterHtml(show);

  try {
    const screenshot = await takeScreenshot({
      path: "about:blank",
      selector: ".poster",
      viewport: { width: 480, height: 720 },
      deviceScaleFactor: 2,
      waitForTimeout: 1500,
      htmlContent: html,
    });

    return new Response(screenshot, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="ftgu-${slug}.jpg"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Poster generation failed:", error);
    return new Response("Failed to generate poster", { status: 500 });
  }
}
