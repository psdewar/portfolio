import { NextRequest } from "next/server";
import { type Show, getShows } from "../../lib/shows";
import { getPamphlets } from "../../lib/pamphlets";
import { formatEventDateShort } from "../../lib/dates";
import { takeScreenshot } from "../../lib/screenshot";

const BASE_URL = process.env.OG_BASE_URL || "https://peytspencer.com";

type PamphletFormat = "standard" | "ig" | "yt";

const DIMS: Record<PamphletFormat, { W: number; H: number }> = {
  standard: { W: 480, H: 720 },
  ig: { W: 540, H: 675 },
  yt: { W: 540, H: 540 },
};

function pamphletHtml(
  shows: Array<{
    date: string;
    city: string;
    region: string;
    venue: string | null;
    venueLabel: string | null;
    doorTime?: string | null;
    doorLabel?: string | null;
  }>,
  format: PamphletFormat = "standard",
  label?: string,
  showDoors = false,
  showQr = false,
  locationOverride = "",
): string {
  const { W, H } = DIMS[format];
  const locationLabelFor = (s: (typeof shows)[number]) =>
    s.venueLabel || `${s.venue ? `${s.venue}, ` : ""}${s.city}, ${s.region}`.trim();
  const first = shows[0] ? locationLabelFor(shows[0]) : "";
  const sharedVenueLabel =
    locationOverride.trim() ||
    (shows.length > 1 && shows.every((s) => locationLabelFor(s) === first) ? first : "");
  const labelSplit = label?.split(/\s([\s\S]*)/) ?? [];
  const [labelFirst = "", labelRest = ""] = labelSplit;
  const showsHtml = shows
    .map((show, i) => {
      const dateStr = formatEventDateShort(show.date);
      const doorsStr =
        showDoors && (show.doorLabel || show.doorTime)
          ? show.doorLabel || `Doors open ${show.doorTime}`
          : "";
      if (sharedVenueLabel) {
        return `
      ${i > 0 ? '<div class="show-divider"></div>' : ""}
      <div class="show-item compact">
        <div class="detail-value date">${dateStr}</div>
        ${doorsStr ? `<div class="detail-value">${doorsStr}</div>` : ""}
      </div>`;
      }
      const locationLabel = locationLabelFor(show);
      return `
      ${i > 0 ? '<div class="show-divider"></div>' : ""}
      <div class="show-item">
        <div class="detail-value date">${dateStr}</div>
        <div class="detail-value">${locationLabel}</div>
        ${doorsStr ? `<div class="detail-value">${doorsStr}</div>` : ""}
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
    .tags { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #e0b860; line-height: 1.4; white-space: pre-line; }
    .top-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
    .rsvp-label { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #c0b8a8; line-height: 1; white-space: nowrap; }
    .detail-value { font-size: 11px; font-weight: 500; color: #c0b8a8; letter-spacing: 0.02em; line-height: 1.3; }
    .detail-value.date { font-size: 15px; font-weight: 700; color: #f0ede6; letter-spacing: 0; line-height: 1.1; }
    .show-item { display: flex; flex-direction: column; gap: 1px; padding: 7px 0; }
    .show-item.compact { flex-direction: row; align-items: center; justify-content: space-between; gap: 14px; padding: 6px 0; }
    .show-item.compact .detail-value.date { flex-shrink: 0; }
    .show-item:first-child { padding-top: 0; }
    .show-divider { height: 1px; background: rgba(212,165,83,0.18); }
    .details-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
    .shows-list { flex: 0 1 auto; min-width: 0; width: fit-content; }
    .qr-section { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
    .qr-code { width: 92px; height: 92px; display: block; }
    ${format === "yt" ? ".qr-code { width: 72px; height: 72px; }" : ""}
    ${format === "ig" ? ".title-from { font-size: 24px; } .title-big { font-size: 66px; }" : ""}
    ${format === "yt" ? ".title-from { font-size: 19.5px; } .title-big { font-size: 54px; } .lockup-img { height: 24.75px; } .lockup-records { font-size: 16.875px; margin-bottom: 1.125px; }" : ""}
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
        <div class="the-concert">that connect us${labelFirst ? ` ${labelFirst}` : ""}</div>
        ${labelRest ? `<div class="the-concert" style="white-space: pre-line;">${labelRest}</div>` : ""}
      </div>
      <div class="details">
        <div class="top-row">
          <div class="tags">Free Admission${sharedVenueLabel ? ` · ${sharedVenueLabel}` : ""}</div>
          <div class="rsvp-label">peytspencer.com/rsvp</div>
        </div>
        <div class="details-row">
          <div class="shows-list">${showsHtml}</div>
          ${showQr ? `<div class="qr-section"><img src="https://assets.peytspencer.com/images/rsvp-qr-s10.png" alt="QR Code" class="qr-code" /></div>` : ""}
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

  type PamphletShow = Pick<
    Show,
    "date" | "city" | "region" | "venue" | "venueLabel" | "doorTime" | "doorLabel"
  >;

  function resolveShows(
    allShows: Show[],
    slugs: string[],
    getVenueLabel: (slug: string, show: Show) => string | null,
  ): PamphletShow[] {
    return slugs
      .map((slug) => {
        const show = allShows.find((s) => s.slug === slug);
        if (!show) return null;
        return { ...show, venueLabel: getVenueLabel(slug, show) };
      })
      .filter((s): s is NonNullable<typeof s> => s != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  // Placeholder slots: ph_0=2026-05-15, ph_1=2026-06-20&phl_1=Portland, OR
  const placeholders: PamphletShow[] = [];
  for (const [key, val] of searchParams.entries()) {
    const m = key.match(/^ph_(\d+)$/);
    if (m && val) {
      const idx = parseInt(m[1]);
      const locationLabel = searchParams.get(`phl_${idx}`)?.trim() || "TBA";
      placeholders.push({
        date: val,
        city: "",
        region: "",
        venue: null,
        venueLabel: locationLabel,
        doorTime: "",
        doorLabel: null,
      });
    }
  }

  let selected: PamphletShow[] = [];
  let pamphletLabel: string | undefined;
  let pamphletShowDoors = false;
  let pamphletShowQr = false;
  let pamphletLocation = "";
  const pamphletId = searchParams.get("id");

  if (!blank) {
    if (pamphletId) {
      const [allShows, pamphlets] = await Promise.all([getShows(), getPamphlets()]);
      const pamphlet = pamphlets.find((p) => p.id === pamphletId);
      if (!pamphlet) {
        return new Response("Pamphlet not found", { status: 404 });
      }
      pamphletLabel = pamphlet.label;
      pamphletShowDoors = pamphlet.showDoors ?? false;
      pamphletShowQr = pamphlet.showQr ?? false;
      pamphletLocation = pamphlet.location ?? "";
      const overrides = new Map(pamphlet.shows.map((ps) => [ps.slug, ps.venueLabel]));
      selected = resolveShows(
        allShows,
        pamphlet.shows.map((ps) => ps.slug),
        (slug, show) => overrides.get(slug) ?? show.venueLabel,
      );
    } else {
      const slugs = searchParams
        .get("slugs")
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!slugs?.length) return new Response("Missing slugs or id", { status: 400 });
      const allShows = await getShows();
      selected = resolveShows(
        allShows,
        slugs,
        (slug, show) => searchParams.get(`vl_${slug}`) ?? show.venueLabel,
      );
    }

    if (!selected.length && !placeholders.length) {
      return new Response("No shows found", { status: 404 });
    }
  }

  if (placeholders.length) {
    selected = [...selected, ...placeholders].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }

  const rawFormat = searchParams.get("format") ?? "standard";
  const format: PamphletFormat = rawFormat in DIMS ? (rawFormat as PamphletFormat) : "standard";
  const { W, H } = DIMS[format];
  const flag = (key: string, fallback: boolean) => {
    const v = searchParams.get(key);
    return v === null ? fallback : v === "1";
  };
  const showDoors = flag("doors", pamphletShowDoors);
  const showQr = flag("qr", pamphletShowQr);
  const location = searchParams.get("loc") ?? pamphletLocation;
  const html = pamphletHtml(selected, format, pamphletLabel, showDoors, showQr, location);

  try {
    const screenshot = await takeScreenshot({
      path: "about:blank",
      selector: ".poster",
      viewport: { width: W, height: H },
      deviceScaleFactor: 2,
      waitForTimeout: 1500,
      htmlContent: html,
    });

    const suffix = format !== "standard" ? `-${format}` : "";
    const filename = blank
      ? `pamphlet-blank${suffix}.jpg`
      : `pamphlet-${pamphletId || selected[0].date}${suffix}.jpg`;
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
