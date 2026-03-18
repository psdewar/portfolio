import { NextRequest } from "next/server";
import { getShows } from "../../lib/shows";
import { takeScreenshot } from "../../lib/screenshot";

const BASE_URL = process.env.OG_BASE_URL || "https://peytspencer.com";

function formatPamphletDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.toLocaleDateString("en-US", { weekday: "long" });
  const month = d.toLocaleDateString("en-US", { month: "long" });
  return `${day}, ${month} ${d.getDate()}`;
}

function pamphletHtml(
  shows: Array<{
    date: string;
    city: string;
    region: string;
    venue: string | null;
    venueLabel: string | null;
  }>,
): string {
  const showsHtml = shows
    .map((show, i) => {
      const dateStr = formatPamphletDate(show.date);
      const locationLabel = show.venueLabel
        ? show.venueLabel
        : `${show.venue ? `${show.venue}, ` : ""}${show.city}, ${show.region}`;
      return `
      ${i > 0 ? '<div class="show-divider"></div>' : ""}
      <div class="show-item">
        <div class="detail-value date">${dateStr}</div>
        <div class="detail-value">${locationLabel}</div>
      </div>`;
    })
    .join("");

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
    .tags { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #e0b860; line-height: 1; }
    .detail-value { font-size: 11px; font-weight: 500; color: #c0b8a8; letter-spacing: 0.02em; }
    .detail-value.date { font-size: 13px; font-weight: 700; color: #f0ede6; }
    .show-item { display: flex; flex-direction: column; gap: 2px; padding: 6px 0; }
    .show-item:first-child { padding-top: 0; }
    .show-divider { height: 1px; background: rgba(255,255,255,0.1); }
    .bottom-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; }
    .rsvp-label { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #c0b8a8; }
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
        <div class="the-concert">My path of growth</div>
        <div class="the-concert">and the principles</div>
        <div class="the-concert">that connect us</div>
      </div>
      <div class="details">
        ${showsHtml}
        <div class="bottom-footer">
          <div class="tags">Free Admission</div>
          <div class="rsvp-label">peytspencer.com/rsvp</div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const blank = searchParams.get("blank") === "true";

  let selected: Array<{
    date: string;
    city: string;
    region: string;
    venue: string | null;
    venueLabel: string | null;
  }> = [];

  if (!blank) {
    const slugs = searchParams
      .get("slugs")
      ?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    if (!slugs?.length) {
      return new Response("Missing slugs", { status: 400 });
    }

    const allShows = await getShows();
    selected = slugs
      .map((slug) => {
        const show = allShows.find((s) => s.slug === slug);
        if (!show) return null;
        return {
          ...show,
          venueLabel: searchParams.get(`vl_${slug}`) ?? show.venueLabel,
        };
      })
      .filter((s): s is NonNullable<typeof s> => s != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (!selected.length) {
      return new Response("No shows found", { status: 404 });
    }
  }

  const html = pamphletHtml(selected);

  try {
    const screenshot = await takeScreenshot({
      path: "about:blank",
      selector: ".poster",
      viewport: { width: 480, height: 720 },
      deviceScaleFactor: 2,
      waitForTimeout: 1500,
      htmlContent: html,
    });

    const filename = blank ? "pamphlet-blank.jpg" : `pamphlet-${selected[0].date}.jpg`;
    return new Response(screenshot, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Pamphlet generation failed:", error);
    return new Response("Failed to generate pamphlet", { status: 500 });
  }
}
