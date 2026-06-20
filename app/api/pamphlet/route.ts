import { NextRequest } from "next/server";
import { type Show, getShows } from "../../lib/shows";
import { getPamphlets } from "../../lib/pamphlets";
import { getLegs } from "../../fund/legs";
import { formatEventDateShort, formatCombinedDates } from "../../lib/dates";
import { takePdf, takeScreenshot } from "../../lib/screenshot";
import { POSTER_DIMS, wideBannerCss, inlineVenueImg } from "../poster/html";
import { DEFAULT_TAGLINE } from "../../lib/poster-defaults";
import { qrDataUrl } from "../../lib/qr";

const BASE_URL = process.env.OG_BASE_URL || "https://peytspencer.com";

type PamphletFormat = keyof typeof POSTER_DIMS;

function pamphletHtml(
  shows: Array<{
    date: string;
    city: string;
    region: string;
    venue: string | null;
    venueLabel: string | null;
    dateLabel?: string | null;
    doorsOpen?: string | null;
    doorTime?: string | null;
    doorLabel?: string | null;
    address?: string | null;
  }>,
  format: PamphletFormat = "standard",
  label?: string,
  showDoors = false,
  showQr = false,
  pinTopRsvp = true,
  tags = "",
  venueImgSrc = "",
  venueImgWidth = 0,
  taglineAlign = "left",
  centerLogo = false,
  doorsOpenOverride = "",
  scale = 1,
  venueImgOffsetY = 0,
): string {
  const { W, H } = POSTER_DIMS[format];
  const qrPath = "/rsvp";
  // Mirror preview's cqw units (percentage of container width) at this format's W.
  const pct = (v: number) => +((W * v) / 100).toFixed(3);
  const venueImgRules = [
    venueImgWidth ? `width:${venueImgWidth}px;height:auto;max-width:none` : "",
    venueImgOffsetY ? `transform:translateY(${venueImgOffsetY}px)` : "",
  ]
    .filter(Boolean)
    .join(";");
  const venueImgStyle = venueImgRules ? ` style="${venueImgRules}"` : "";
  const locationLabelFor = (s: (typeof shows)[number]) =>
    s.venueLabel ?? `${s.venue ? `${s.venue}, ` : ""}${s.city}, ${s.region}`.trim();
  const dateFor = (s: (typeof shows)[number]) => s.dateLabel ?? formatEventDateShort(s.date);
  const doorsFor = (s: (typeof shows)[number]) =>
    s.doorsOpen ?? (s.doorLabel || (s.doorTime ? `Doors open at ${s.doorTime}` : ""));
  const firstLoc = shows[0] ? locationLabelFor(shows[0]) : "";
  const allSameLocation =
    shows.length > 1 && !!firstLoc && shows.every((s) => locationLabelFor(s) === firstLoc);
  const sharedLocation = allSameLocation ? firstLoc : "";
  const sameDoors = !showDoors || shows.every((s) => doorsFor(s) === doorsFor(shows[0]));
  const isCompact = !!sharedLocation && sameDoors;
  const isWide = format === "eb" || format === "fb" || format === "fbe";
  const venueImgSrcEffective = isWide ? "" : venueImgSrc;
  const taglineLines = isWide ? [] : (label || DEFAULT_TAGLINE).split("\n");
  const taglineDivs = taglineLines
    .map((line) => `        <div class="the-concert">${line}</div>`)
    .join("\n");
  const tagsList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 3);
  const topRowParts = [...tagsList, ...(sharedLocation ? [sharedLocation] : [])];
  const tagsLine = topRowParts.join(" · ");
  let showsHtml: string;
  if (isCompact) {
    const combinedDate = formatCombinedDates(shows.map((s) => s.date));
    const first = shows[0];
    const compactDoors = showDoors ? (first ? doorsFor(first) : "") || doorsOpenOverride : "";
    showsHtml = `
      <div class="pamphlet-show">
        <div class="pamphlet-date">${combinedDate}</div>
        ${compactDoors ? `<div class="pamphlet-detail">${compactDoors}</div>` : ""}
      </div>`;
  } else {
    showsHtml = shows
      .map((show, i) => {
        const dateStr = dateFor(show);
        const locStr = locationLabelFor(show);
        const doorsStr = showDoors ? doorsFor(show) : "";
        const dividerHtml =
          i > 0 && format !== "print" ? '<div class="pamphlet-divider"></div>' : "";
        return `
      ${dividerHtml}
      <div class="pamphlet-show">
        ${dateStr ? `<div class="pamphlet-date">${dateStr}</div>` : ""}
        ${locStr ? `<div class="pamphlet-detail">${locStr}</div>` : ""}
        ${doorsStr ? `<div class="pamphlet-detail">${doorsStr}</div>` : ""}
      </div>`;
      })
      .join("");
  }

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
    .photo-overlay { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(to right, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.65) 15%, rgba(10,10,10,0.22) 45%, transparent 70%); z-index: 3; }
    .bottom-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 40%; background: linear-gradient(to top, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.75) 25%, rgba(10,10,10,0.4) 55%, transparent 100%); z-index: 4; }
    .content { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; padding: ${pct(5)}px ${pct(5.833)}px; }
    .lockup { display: flex; align-items: center; gap: ${pct(0.625)}px; margin-bottom: ${pct(0.833)}px; }
    .lockup-img { height: ${pct(4.583)}px; width: auto; }
    .lockup-records { font-family: "Fira Sans", sans-serif; font-size: ${pct(3.333)}px; font-weight: 500; color: #ffffff; transform: translateY(${-pct(0.104)}px); will-change: transform; }
    .presents { font-family: "Space Mono", monospace; font-size: ${pct(2.083)}px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #e0b860; margin-bottom: ${pct(1.667)}px; margin-top: ${pct(1.667)}px; }
    .title-block { margin-bottom: auto; }
    .title-from { font-size: ${pct(5.417)}px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #d4a553; line-height: 0.9; }
    .title-big { font-size: ${pct(11.76)}px; font-weight: 800; line-height: 0.9; letter-spacing: -0.01em; color: #f0ede6; text-transform: uppercase; margin-left: ${-pct(0.417)}px; }
    .title-accent { width: ${pct(13.333)}px; height: ${pct(0.625)}px; background: linear-gradient(to right, #d4a553, #e0b860); margin: ${pct(1.25)}px 0 ${pct(1.458)}px; }
    .the-concert { font-family: "Space Mono", monospace; font-size: ${pct(2.083)}px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #e0b860; }
    .tagline-block { width: fit-content; text-align: ${taglineAlign}; text-align-last: ${taglineAlign}; }
    .venue-wrap { position: relative; width: fit-content; }
    .venue-img { display: block; height: ${pct(22.917)}px; width: auto; max-width: ${pct(45.833)}px; margin: ${pct(2.917)}px 0 ${pct(2.083)}px; object-fit: contain; }
    .theme-topright { position: absolute; top: ${pct(5)}px; right: ${pct(5.833)}px; text-align: right; font-family: "Space Mono", monospace; font-size: ${pct(2.083)}px; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; color: #f0ede6; line-height: 1.6; transform: translateY(${-pct(0.521)}px); will-change: transform; }
    .details { margin-top: auto; width: 100%; }
    .tags { font-family: "Space Mono", monospace; font-size: ${pct(2.083)}px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #e0b860; line-height: 1; }
    .pamphlet-top { display: flex; align-items: baseline; justify-content: space-between; gap: ${pct(3.333)}px; margin-bottom: ${pct(2.083)}px; }
    .pamphlet-rows { position: relative; display: flex; align-items: stretch; justify-content: space-between; gap: ${pct(3.75)}px; }
    .pamphlet-shows { position: relative; flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: space-between; }
    .pamphlet-divider { height: ${pct(0.208)}px; background: rgba(212,165,83,0.18); margin: ${pct(0.729)}px 0; }
    .pamphlet-show { display: flex; flex: 1; flex-direction: column; justify-content: center; gap: ${pct(1.667 * scale)}px; }
    .pamphlet-date { font-size: ${pct(4.167 * scale)}px; font-weight: 700; color: #f0ede6; letter-spacing: 0; line-height: 1.1; flex-shrink: 0; }
    .pamphlet-detail { font-size: ${pct(2.917 * scale)}px; font-weight: 500; color: #f0ede6; letter-spacing: 0.02em; line-height: 1.3; }
    .qr-section { display: flex; flex-direction: column; align-items: flex-end; gap: ${pct(1.667)}px; flex-shrink: 0; justify-content: ${pinTopRsvp ? "space-between" : "flex-end"}; }
    .qr-code { width: ${pct(19.167)}px; height: ${pct(19.167)}px; display: block; }
    .qr-label { font-family: "Space Mono", monospace; font-size: ${pct(2.083)}px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #f0ede6; line-height: 1; white-space: nowrap; text-decoration: none; text-align: center; }
    ${format === "ig" ? `.title-from { font-size: ${pct(4.444)}px; } .title-big { font-size: ${pct(12.222)}px; }` : ""}
    ${format === "yt" ? `.title-from { font-size: ${pct(3.611)}px; } .title-big { font-size: ${pct(10)}px; } .venue-img { height: ${pct(16)}px; max-width: ${pct(32)}px; margin: ${pct(2)}px 0 ${pct(1.5)}px; } .pamphlet-date { font-size: ${pct(3.2 * scale)}px; } .pamphlet-detail { font-size: ${pct(2.2 * scale)}px; } .qr-label { font-size: ${pct(1.8)}px; }` : ""}
    ${format === "eb" ? ".poster-bg { object-position: center 37.5%; } .bottom-overlay { display: none; } .details { display: none; } .venue-img { display: none; } .content { padding: 36px 42px; } .lockup-img { height: 33px; } .lockup-records { font-size: 24px; transform: translateY(-1.875px); } .presents { font-size: 15px; margin-bottom: 12px; margin-top: 12px; } .title-from { font-size: 39px; } .title-big { font-size: 108px; } .title-accent { width: 96px; height: 4.5px; margin: 9px 0 10.5px; } .the-concert { font-size: 15px; } .theme-topright { font-size: 13.5px; top: 36px; right: 42px; }" : ""}
    ${format === "fb" || format === "fbe" ? wideBannerCss() + " .venue-img { display: none; }" : ""}
    ${format === "fbe" ? ".poster-bg { object-position: center 61%; } .title-big { font-size: 84px; }" : ""}
    ${format === "fb" ? ".poster-bg { object-position: center 53%; } .presents { font-size: 10px; margin-top: 6px; margin-bottom: 6px; } .title-from { font-size: 24px; } .title-big { font-size: 60px; } .title-accent { height: 3px; width: 60px; margin: 5px 0 5px; } .the-concert { font-size: 10px; } .theme-topright { font-size: 10px; } .lockup { margin-top: auto; } .title-block { margin-bottom: 0; } .bottom-overlay { display: block; }" : ""}
    ${format === "print" ? ".pamphlet-divider { display: none; }" : ""}
  </style>
</head>
<body>
  <div class="poster">
    <img src="${format === "fb" || format === "fbe" ? `${BASE_URL}/Jan23OpenMicNight-07_Original.JPEG` : `${BASE_URL}/Jan23OpenMicNight-08_Original.jpg`}" alt="" class="poster-bg" />
    <div class="photo-overlay"></div>
    <div class="bottom-overlay"></div>
    <div class="content">
      <div class="theme-topright">
        <div>a rap concert for all ages</div>
        <div>by microsoft engineer</div>
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
        <div class="tagline-block" id="tagline-block">
${taglineDivs}
        </div>
        ${venueImgSrcEffective ? `<div class="venue-wrap" id="venue-wrap"><img src="${venueImgSrc}" alt="" class="venue-img"${venueImgStyle} /></div>` : ""}
      </div>
      <div class="details">
        ${tagsLine ? `<div class="pamphlet-top"><div class="tags">${tagsLine}</div></div>` : ""}
        <div class="pamphlet-rows">
          <div class="pamphlet-shows">${showsHtml}</div>
          <div class="qr-section">
            <a class="qr-label" href="https://peytspencer.com${qrPath}">peytspencer.com/rsvp</a>
            ${showQr ? `<img src="${qrDataUrl(qrPath)}" alt="QR Code" class="qr-code" />` : ""}
          </div>
        </div>
      </div>
    </div>
  </div>
  <script>
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function() {
      var label = document.querySelector('.qr-section .qr-label');
      var qr = document.querySelector('.qr-section .qr-code');
      if (label && qr) {
        var ls = parseFloat(getComputedStyle(label).letterSpacing) || 0;
        var w = label.getBoundingClientRect().width - ls;
        qr.style.width = w + 'px';
        qr.style.height = w + 'px';
      }
      ${centerLogo ? `
      var tagline = document.getElementById('tagline-block');
      var wrap = document.getElementById('venue-wrap');
      if (tagline && wrap) {
        wrap.style.width = tagline.offsetWidth + 'px';
        wrap.style.display = 'flex';
        wrap.style.justifyContent = 'center';
      }` : ""}
    });
  </script>
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
    "date" | "city" | "region" | "venue" | "venueLabel" | "doorTime" | "doorLabel" | "address"
  > & { dateLabel?: string | null; doorsOpen?: string | null };

  type ShowOverride = {
    venueLabel?: string | null;
    dateLabel?: string | null;
    doorsOpen?: string | null;
  };

  const defaultLoc = (s: Show) =>
    s.venueLabel || `${s.venue ? `${s.venue}, ` : ""}${s.city}, ${s.region}`.trim();
  const defaultDoors = (s: Show) =>
    s.doorLabel || (s.doorTime ? `Doors open at ${s.doorTime}` : "");

  function resolveShows(
    allShows: Show[],
    slugs: string[],
    getOverride: (slug: string, show: Show) => ShowOverride,
  ): PamphletShow[] {
    return slugs
      .map((slug) => {
        const show = allShows.find((s) => s.slug === slug);
        if (!show) return null;
        const ov = getOverride(slug, show);
        return {
          ...show,
          venueLabel: ov.venueLabel ?? defaultLoc(show),
          dateLabel: ov.dateLabel ?? formatEventDateShort(show.date),
          doorsOpen: ov.doorsOpen ?? defaultDoors(show),
        };
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
        address: null,
      });
    }
  }

  let selected: PamphletShow[] = [];
  let pamphletLabel: string | undefined;
  let pamphletShowDoors = false;
  let pamphletShowQr = false;
  let pamphletPinTopRsvp = true;
  let pamphletTags = "";
  let pamphletVenueImg = "";
  let pamphletVenueImgWidth = 0;
  let pamphletVenueImgOffsetY = 0;
  let pamphletCenterLogo = false;
  let pamphletTaglineAlign = "";
  let pamphletDoorsOpen = "";
  let pamphletScale = 1;
  const pamphletId = searchParams.get("id");

  if (!blank) {
    if (pamphletId) {
      const [allShows, legs] = await Promise.all([getShows(), getLegs()]);
      const leg = legs.find((l) => l.slug === pamphletId);
      if (leg?.pamphlet) {
        // Leg-native poster: styling from the facet, shows derived from Show.leg.
        const pf = leg.pamphlet;
        pamphletLabel = pf.label;
        pamphletShowDoors = pf.showDoors ?? false;
        pamphletShowQr = pf.showQr ?? false;
        pamphletPinTopRsvp = pf.pinTopRsvp ?? true;
        pamphletTags = pf.tags ?? "";
        pamphletVenueImg = pf.venueImg ?? "";
        pamphletVenueImgWidth = pf.venueImgWidth ?? 0;
        pamphletVenueImgOffsetY = pf.venueImgOffsetY ?? 0;
        pamphletCenterLogo = pf.centerLogo ?? false;
        pamphletTaglineAlign = pf.taglineAlign ?? "";
        pamphletDoorsOpen = pf.doorsOpen ?? "";
        pamphletScale = pf.scale ?? 1;
        const overlay = pf.shows ?? {};
        const legSlugs = allShows.filter((s) => s.leg === pamphletId).map((s) => s.slug);
        const included = Object.keys(overlay).filter((s) => legSlugs.includes(s));
        const slugs = included.length ? included : legSlugs;
        selected = resolveShows(allShows, slugs, (slug) => overlay[slug] ?? {});
      } else {
        // Fallback: legacy pamphlet store (un-migrated).
        const pamphlet = (await getPamphlets()).find((p) => p.id === pamphletId);
        if (!pamphlet) {
          return new Response("Pamphlet not found", { status: 404 });
        }
        pamphletLabel = pamphlet.label;
        pamphletShowDoors = pamphlet.showDoors ?? false;
        pamphletShowQr = pamphlet.showQr ?? false;
        pamphletPinTopRsvp = pamphlet.pinTopRsvp ?? true;
        pamphletTags = pamphlet.tags ?? "";
        pamphletVenueImg = pamphlet.venueImg ?? "";
        pamphletVenueImgWidth = pamphlet.venueImgWidth ?? 0;
        pamphletVenueImgOffsetY = pamphlet.venueImgOffsetY ?? 0;
        pamphletCenterLogo = pamphlet.centerLogo ?? false;
        pamphletTaglineAlign = pamphlet.taglineAlign ?? "";
        pamphletDoorsOpen = pamphlet.doorsOpen ?? "";
        pamphletScale = pamphlet.scale ?? 1;
        const overrides = new Map(pamphlet.shows.map((ps) => [ps.slug, ps]));
        selected = resolveShows(
          allShows,
          pamphlet.shows.map((ps) => ps.slug),
          (slug) => {
            const ps = overrides.get(slug);
            return {
              venueLabel: ps?.venueLabel,
              dateLabel: ps?.dateLabel,
              doorsOpen: ps?.doorsOpen,
            };
          },
        );
      }
    } else {
      const slugs = searchParams
        .get("slugs")
        ?.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!slugs?.length) return new Response("Missing slugs or id", { status: 400 });
      const allShows = await getShows();
      selected = resolveShows(allShows, slugs, (slug) => ({
        venueLabel: searchParams.get(`vl_${slug}`),
        dateLabel: searchParams.get(`dt_${slug}`),
        doorsOpen: searchParams.get(`do_${slug}`),
      }));
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
  const format: PamphletFormat = rawFormat in POSTER_DIMS ? (rawFormat as PamphletFormat) : "standard";
  const { W, H } = POSTER_DIMS[format];
  const flag = (key: string, fallback: boolean) => {
    const v = searchParams.get(key);
    return v === null ? fallback : v === "1";
  };
  const showDoors = flag("doors", pamphletShowDoors);
  const showQr = flag("qr", pamphletShowQr);
  const pinTopRsvp = flag("pinTopRsvp", pamphletPinTopRsvp);
  const centerLogo = flag("centerLogo", pamphletCenterLogo);
  const tags = searchParams.get("tags") ?? pamphletTags;
  const venueImgSrc = inlineVenueImg(searchParams.get("venueImg")?.trim() || pamphletVenueImg);
  const venueImgOffsetY = Number(searchParams.get("venueImgOffsetY")) || pamphletVenueImgOffsetY || 0;
  const doorsOpenOverride = (searchParams.get("doorsOpen") ?? pamphletDoorsOpen).trim();
  const scale = Math.min(2, Math.max(0.5, Number(searchParams.get("scale")) || pamphletScale || 1));
  const html = pamphletHtml(
    selected,
    format,
    searchParams.get("label") ?? pamphletLabel,
    showDoors,
    showQr,
    pinTopRsvp,
    tags,
    venueImgSrc,
    Number(searchParams.get("venueImgW")) || pamphletVenueImgWidth,
    searchParams.get("align") || pamphletTaglineAlign || "left",
    centerLogo,
    doorsOpenOverride,
    scale,
    venueImgOffsetY,
  );
  // Raw HTML for in-app previews — skips Puppeteer entirely.
  if (searchParams.get("html") === "true") {
    return new Response(html, {
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const isPdf = searchParams.get("pdf") === "true";
  const suffix = format !== "standard" ? `-${format}` : "";
  const baseName = blank
    ? `pamphlet-blank${suffix}`
    : `pamphlet-${pamphletId || selected[0].date}${suffix}`;

  try {
    if (isPdf) {
      const pdf = await takePdf({
        htmlContent: html,
        viewport: { width: W, height: H },
        pageFormat: format === "print" ? "Letter" : "match",
      });
      return new Response(pdf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${baseName}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const screenshot = await takeScreenshot({
      path: "about:blank",
      selector: ".poster",
      viewport: { width: W, height: H },
      deviceScaleFactor: 2,
      waitForTimeout: 1500,
      htmlContent: html,
    });

    return new Response(screenshot, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": `attachment; filename="${baseName}.jpg"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Pamphlet generation failed:", error);
    return new Response("Failed to generate pamphlet", { status: 500 });
  }
}
