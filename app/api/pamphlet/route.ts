import { NextRequest } from "next/server";
import { type Show, getShows } from "../../lib/shows";
import { getPamphlets } from "../../lib/pamphlets";
import { formatEventDateShort } from "../../lib/dates";
import { takePdf, takeScreenshot } from "../../lib/screenshot";
import { inlineAsset } from "../poster/html";

const BASE_URL = process.env.OG_BASE_URL || "https://peytspencer.com";

type PamphletFormat = "standard" | "ig" | "yt" | "letter" | "eb";

const DIMS: Record<PamphletFormat, { W: number; H: number }> = {
  standard: { W: 480, H: 720 },
  ig: { W: 540, H: 675 },
  yt: { W: 540, H: 540 },
  letter: { W: 612, H: 792 },
  eb: { W: 1080, H: 540 },
};

function formatCombinedDates(dates: string[]): string {
  if (dates.length === 0) return "";
  const parsed = dates
    .map((d) => new Date(d + "T00:00:00"))
    .sort((a, b) => a.getTime() - b.getTime());
  const short = (d: Date) => d.toLocaleString("en-US", { weekday: "short" });
  const month = (d: Date) => d.toLocaleString("en-US", { month: "long" });
  const long = (d: Date) => d.toLocaleString("en-US", { weekday: "long" });
  const sameMonth = parsed.every(
    (d) => d.getMonth() === parsed[0].getMonth() && d.getFullYear() === parsed[0].getFullYear(),
  );
  const sameYear = parsed.every((d) => d.getFullYear() === parsed[0].getFullYear());
  const includeWeekdays = parsed.length <= 3;

  // Single date: conventional "Friday, May 29, 2026"
  if (parsed.length === 1) {
    return `${long(parsed[0])}, ${month(parsed[0])} ${parsed[0].getDate()}, ${parsed[0].getFullYear()}`;
  }

  // Same month, ≤3 dates: "Fri 29 · Sat 30 · May 2026"
  if (sameMonth && includeWeekdays) {
    const dayPairs = parsed.map((d) => `${short(d)} ${d.getDate()}`).join(" · ");
    return `${dayPairs} · ${month(parsed[0])} ${parsed[0].getFullYear()}`;
  }
  // Same month, >3 dates: drop weekdays for compactness
  if (sameMonth) {
    return `${month(parsed[0])} ${parsed.map((d) => d.getDate()).join(", ")}, ${parsed[0].getFullYear()}`;
  }
  // Same year, ≤3 dates: "Fri, May 29 & Sat, Jun 6, 2026"
  if (sameYear && includeWeekdays) {
    const parts = parsed.map((d) => `${short(d)}, ${month(d)} ${d.getDate()}`);
    return `${parts.join(" & ")}, ${parsed[0].getFullYear()}`;
  }
  // Same year, >3 dates: drop weekdays
  if (sameYear) {
    return `${parsed.map((d) => `${month(d)} ${d.getDate()}`).join(", ")}, ${parsed[0].getFullYear()}`;
  }
  // Different years
  return parsed
    .map(
      (d) =>
        `${includeWeekdays ? short(d) + ", " : ""}${month(d)} ${d.getDate()}, ${d.getFullYear()}`,
    )
    .join(" & ");
}

function pamphletHtml(
  shows: Array<{
    date: string;
    city: string;
    region: string;
    venue: string | null;
    venueLabel: string | null;
    doorTime?: string | null;
    doorLabel?: string | null;
    address?: string | null;
  }>,
  format: PamphletFormat = "standard",
  label?: string,
  showDoors = false,
  showQr = false,
  tags = "",
  venueImgSrc = "",
  addressOverride = "",
  doorsOpenOverride = "",
): string {
  const { W, H } = DIMS[format];
  const locationLabelFor = (s: (typeof shows)[number]) =>
    s.venueLabel || `${s.venue ? `${s.venue}, ` : ""}${s.city}, ${s.region}`.trim();
  const first = shows[0] ? locationLabelFor(shows[0]) : "";
  const sharedVenueLabel =
    tags.trim() ||
    (shows.length > 1 && shows.every((s) => locationLabelFor(s) === first) ? first : "");
  const isEb = format === "eb";
  const labelSplit = label?.split(/\s([\s\S]*)/) ?? [];
  const [labelFirstRaw = "", labelRestRaw = ""] = labelSplit;
  const labelFirst = isEb ? "" : labelFirstRaw;
  const labelRest = isEb ? "" : labelRestRaw;
  const venueImgSrcEffective = isEb ? "" : venueImgSrc;
  const tagsList = tags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 2);
  const sep = tagsList.length >= 2 ? " · " : " · ";
  const tagsSuffix = tagsList.length ? sep + tagsList.join(sep) : "";
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
    .photo-overlay { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(to right, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.65) 15%, rgba(10,10,10,0.22) 45%, transparent 70%); z-index: 3; }
    .bottom-overlay { position: absolute; bottom: 0; left: 0; width: 100%; height: 40%; background: linear-gradient(to top, rgba(10,10,10,0.9) 0%, rgba(10,10,10,0.75) 25%, rgba(10,10,10,0.4) 55%, transparent 100%); z-index: 4; }
    .content { position: absolute; inset: 0; z-index: 5; display: flex; flex-direction: column; padding: 24px 28px; }
    .lockup { display: flex; align-items: center; gap: 3px; margin-bottom: 4px; }
    .lockup-img { height: 22px; width: auto; }
    .lockup-records { font-family: "Fira Sans", sans-serif; font-size: 16px; font-weight: 500; color: #ffffff; transform: translateY(-1.5px); will-change: transform; }
    .presents { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #e0b860; margin-bottom: 8px; margin-top: 8px; }
    .title-block { margin-bottom: auto; }
    .title-from { font-size: 26px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: #d4a553; line-height: 0.9; }
    .title-big { font-size: 72px; font-weight: 800; line-height: 0.9; letter-spacing: -0.01em; color: #f0ede6; text-transform: uppercase; margin-left: -2px; }
    .title-accent { width: 64px; height: 3px; background: linear-gradient(to right, #d4a553, #e0b860); margin: 6px 0 7px; }
    .the-concert { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #e0b860; }
    .venue-img { display: block; height: 110px; width: auto; max-width: 220px; margin: 14px 0 10px; object-fit: contain; }
    .bottom-row { display: flex; align-items: stretch; justify-content: space-between; gap: 16px; }
    .bottom-left { display: flex; flex-direction: column; justify-content: space-between; }
    .bottom-left .tags { line-height: 1; }
    .bottom-left .detail-value { font-size: 14px; font-weight: 500; color: #f0ede6; letter-spacing: 0.02em; line-height: 1; }
    .bottom-left .detail-value.date { font-size: 20px; font-weight: 700; color: #f0ede6; letter-spacing: 0; line-height: 1; }
    .bottom-left.three-line .detail-value { font-size: 14px; }
    .bottom-left.three-line .detail-value.date { font-size: 22px; }
    .bottom-right-stack { display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; gap: 8px; }
    .qr-code { width: 92px; height: 92px; display: block; }
    .theme-topright { position: absolute; top: 24px; right: 28px; text-align: right; font-family: "Space Mono", monospace; font-size: 10px; font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; color: #f0ede6; line-height: 1.6; transform: translateY(-2.5px); will-change: transform; }
    .details { margin-top: auto; width: 100%; }
    .tags { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.06em; text-transform: uppercase; color: #e0b860; line-height: 1.4; white-space: pre-line; }
    .top-row { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
    .rsvp-label { font-family: "Space Mono", monospace; font-size: 10px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; color: #f0ede6; line-height: 1; white-space: nowrap; text-decoration: none; }
    .detail-value { font-size: 11px; font-weight: 500; color: #f0ede6; letter-spacing: 0.02em; line-height: 1.3; }
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
    ${format === "ig" ? ".title-from { font-size: 24px; } .title-big { font-size: 66px; } .bottom-left.three-line .detail-value.date { font-size: 20px; }" : ""}
    ${format === "yt" ? ".title-from { font-size: 19.5px; } .title-big { font-size: 54px; } .qr-code { width: 72px; height: 72px; } .bottom-left.three-line .detail-value.date { font-size: 17px; }" : ""}
    ${format === "eb" ? ".poster-bg { object-position: center 37.5%; } .bottom-overlay { display: none; } .details { display: none; } .venue-img { display: none; } .content { padding: 36px 42px; } .lockup-img { height: 33px; } .lockup-records { font-size: 24px; transform: translateY(-1.875px); } .presents { font-size: 15px; margin-bottom: 12px; margin-top: 12px; } .title-from { font-size: 39px; } .title-big { font-size: 108px; } .title-accent { width: 96px; height: 4.5px; margin: 9px 0 10.5px; } .the-concert { font-size: 15px; } .theme-topright { font-size: 13.5px; top: 36px; right: 42px; }" : ""}
    ${
      format === "letter"
        ? `
      .title-from { font-size: 31.2px; }
      .lockup-img { height: 26.4px; }
      .lockup-records { font-size: 19.2px; }
      .presents { font-size: 12px; }
      .the-concert { font-size: 12px; }
      .theme-topright { font-size: 12px; }
      .tags { font-size: 12px; }
      .rsvp-label { font-size: 12px; }
      .bottom-left .detail-value { font-size: 16.8px; }
      .bottom-left .detail-value.date { font-size: 24px; }
      .bottom-left.three-line .detail-value { font-size: 16px; }
      .bottom-left.three-line .detail-value.date { font-size: 26.5px; }
      .venue-img { height: 132px; max-width: 264px; }
      .qr-code { width: 110.4px; height: 110.4px; }
    `
        : ""
    }
  </style>
</head>
<body>
  <div class="poster">
    <img src="${BASE_URL}/Jan23OpenMicNight-08_Original.jpg" alt="" class="poster-bg" />
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
        <div class="the-concert">my path of growth</div>
        <div class="the-concert">and the principles</div>
        <div class="the-concert">that connect us${venueImgSrcEffective ? " at" : labelFirst ? ` ${labelFirst}` : ""}</div>
        ${!venueImgSrcEffective && labelRest ? `<div class="the-concert" style="white-space: pre-line;">${labelRest}</div>` : ""}
        ${venueImgSrcEffective ? `<img src="${venueImgSrc}" alt="" class="venue-img" />` : ""}
      </div>
      ${
        venueImgSrc
          ? `
      <div class="details">
        <div class="bottom-row">
          <div class="bottom-left${tagsList.length ? "" : " three-line"}">
            ${tagsList.length ? `<div class="tags">${tagsList.join(sep)}</div>` : ""}
            <div class="detail-value date">${formatCombinedDates(shows.map((s) => s.date))}</div>
            <div class="detail-value">${
              addressOverride.trim() ||
              (shows[0]
                ? [shows[0].address, shows[0].city, shows[0].region].filter(Boolean).join(", ")
                : sharedVenueLabel || "")
            }</div>
            <div class="detail-value">${
              doorsOpenOverride ||
              shows[0]?.doorLabel ||
              `Doors open at ${shows[0]?.doorTime || "7PM"}`
            }</div>
          </div>
          <div class="bottom-right-stack">
            <a class="rsvp-label" href="https://peytspencer.com/rsvp">peytspencer.com/rsvp</a>
            ${showQr ? `<img src="https://assets.peytspencer.com/images/rsvp-qr-s10.png" alt="QR Code" class="qr-code" />` : ""}
          </div>
        </div>
      </div>`
          : `
      <div class="details">
        <div class="top-row">
          ${(() => {
            const parts = sharedVenueLabel ? [...tagsList, sharedVenueLabel] : tagsList;
            return parts.length ? `<div class="tags">${parts.join(sep)}</div>` : `<div></div>`;
          })()}
          <a class="rsvp-label" href="https://peytspencer.com/rsvp">peytspencer.com/rsvp</a>
        </div>
        <div class="details-row">
          <div class="shows-list">${showsHtml}</div>
          ${showQr ? `<div class="qr-section"><img src="https://assets.peytspencer.com/images/rsvp-qr-s10.png" alt="QR Code" class="qr-code" /></div>` : ""}
        </div>
      </div>`
      }
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
    "date" | "city" | "region" | "venue" | "venueLabel" | "doorTime" | "doorLabel" | "address"
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
        address: null,
      });
    }
  }

  let selected: PamphletShow[] = [];
  let pamphletLabel: string | undefined;
  let pamphletShowDoors = false;
  let pamphletShowQr = false;
  let pamphletTags = "";
  let pamphletVenueImg = "";
  let pamphletAddress = "";
  let pamphletDoorsOpen = "";
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
      pamphletTags = pamphlet.tags ?? "";
      pamphletVenueImg = pamphlet.venueImg ?? "";
      pamphletAddress = pamphlet.address ?? "";
      pamphletDoorsOpen = pamphlet.doorsOpen ?? "";
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
  const tags = searchParams.get("tags") ?? pamphletTags;
  const venueImgPath = (searchParams.get("venueImg")?.trim() || pamphletVenueImg).trim();
  const venueMime = venueImgPath.endsWith(".png")
    ? "image/png"
    : venueImgPath.endsWith(".jpg") || venueImgPath.endsWith(".jpeg")
      ? "image/jpeg"
      : venueImgPath.endsWith(".svg")
        ? "image/svg+xml"
        : "image/webp";
  const venueImgSrc = venueImgPath ? inlineAsset(venueImgPath, venueMime) : "";
  const addressOverride = (searchParams.get("address") ?? pamphletAddress).trim();
  const doorsOpenOverride = (searchParams.get("doorsOpen") ?? pamphletDoorsOpen).trim();
  const html = pamphletHtml(
    selected,
    format,
    pamphletLabel,
    showDoors,
    showQr,
    tags,
    venueImgSrc,
    addressOverride,
    doorsOpenOverride,
  );
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
        pageFormat: format === "letter" ? "Letter" : "match",
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
