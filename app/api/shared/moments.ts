import {
  GetObjectCommand,
  PutObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { revalidateTag, unstable_cache } from "next/cache";
import sharp from "sharp";
import { s3, s3Bucket } from "./s3";
import { getShows, isShowOnTrip } from "../../lib/shows";
import { getFundingLegSlug } from "../../fund/legs";

const FEATURED_KEY = "featured.json";

// next@16.1.1 (installed) declares revalidateTag(tag, profile) with profile
// REQUIRED — see node_modules/next/dist/server/web/spec-extension/revalidate.d.ts.
// The one-arg form from Next 14/15 fails tsc here ("Expected 2 arguments, but
// got 1"). "max" is the hard-purge profile.
export function purgeFeatured() {
  revalidateTag("moments-featured", "max");
}

async function getJson(key: string): Promise<unknown> {
  if (!s3 || !s3Bucket) return null;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: key }));
    const text = await res.Body?.transformToString();
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

async function putJson(key: string, value: unknown): Promise<void> {
  if (!s3 || !s3Bucket) return;
  await s3.send(
    new PutObjectCommand({
      Bucket: s3Bucket,
      Key: key,
      Body: JSON.stringify(value),
      ContentType: "application/json",
    }),
  );
}

export function sanitizeFilename(name: string) {
  return name.replace(/[^\w.-]/g, "_").slice(0, 200);
}

export function contentKey(filename: string, hash: string, captured?: number) {
  const dot = filename.lastIndexOf(".");
  const ext =
    dot > 0 ? filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, "") : "";
  const body = captured ? `${hash}-${captured}` : hash;
  return ext ? `drops/${body}.${ext}` : `drops/${body}`;
}

export function previewKeyFor(originalKey: string): string {
  const base = originalKey.replace(/^drops\//, "").replace(/\.[^./]+$/, "");
  return `previews/${base}.jpg`;
}

const CITIES_KEY = "cities.json";

export async function getCities(): Promise<Record<string, string>> {
  const parsed = await getJson(CITIES_KEY);
  return parsed && typeof parsed === "object" ? (parsed as Record<string, string>) : {};
}

export async function setCity(key: string, city: string | null): Promise<void> {
  const current = await getCities();
  if (city) current[key] = city;
  else delete current[key];
  await putJson(CITIES_KEY, current);
}

export function capturedAt(key: string): number | null {
  const m = key.match(/^drops\/[a-f0-9]{64}-(\d+)\./);
  return m ? Number(m[1]) : null;
}

export function coordsFrom(body: Record<string, unknown>) {
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180 &&
    (lat !== 0 || lng !== 0)
    ? { lat, lng }
    : null;
}

const STOPS_KEY = "stops.json";
const STOP_RADIUS_KM = 100;
const GEOCODE_UA = "peytspencer.com moments (psdewar2@gmail.com)";

function showLabel(s: { city: string; region: string }) {
  return s.region ? `${s.city}, ${s.region}` : s.city;
}

async function geocodeStop(label: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(label)}&format=jsonv2&limit=1`,
      { headers: { "User-Agent": GEOCODE_UA } },
    );
    const hit = ((await res.json()) as Array<{ lat: string; lon: string }>)[0];
    const lat = Number(hit?.lat);
    const lng = Number(hit?.lon);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null;
  } catch {
    return null;
  }
}

async function stopCoords(): Promise<Array<{ label: string; lat: number; lng: number }>> {
  const [shows, cachedRaw] = await Promise.all([getShows(), getJson(STOPS_KEY)]);
  const cached =
    cachedRaw && typeof cachedRaw === "object"
      ? (cachedRaw as Record<string, [number, number]>)
      : {};
  const labels = new Set<string>();
  for (const s of shows) if (s.city) labels.add(showLabel(s));
  const out: Array<{ label: string; lat: number; lng: number }> = [];
  let added = false;
  for (const label of labels) {
    let c = cached[label];
    if (!c) {
      const g = await geocodeStop(label);
      if (!g) continue;
      cached[label] = g;
      c = g;
      added = true;
    }
    out.push({ label, lat: c[0], lng: c[1] });
  }
  if (added) await putJson(STOPS_KEY, cached).catch(() => {});
  return out;
}

function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const rad = Math.PI / 180;
  const dLat = (bLat - aLat) * rad;
  const dLng = (bLng - aLng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(aLat * rad) * Math.cos(bLat * rad) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

// GPS never invents a label: coordinates snap to the nearest tour stop, so
// every city shown is one the tour actually visited.
export async function cityFromCoords(lat: number, lng: number): Promise<string | null> {
  try {
    const stops = await stopCoords();
    let best: string | null = null;
    let bestD = Infinity;
    for (const s of stops) {
      const d = distanceKm(lat, lng, s.lat, s.lng);
      if (d < bestD) {
        bestD = d;
        best = s.label;
      }
    }
    return bestD <= STOP_RADIUS_KM ? best : null;
  } catch {
    return null;
  }
}

// The photo's own GPS decides its stop; skip if a city is already stored. The
// re-read after writing recovers a write lost to a concurrent sibling upload.
export async function recordCityFromCoords(
  key: string,
  lat: number,
  lng: number,
): Promise<void> {
  try {
    const cities = await getCities();
    if (cities[key]) return;
    const city = await cityFromCoords(lat, lng);
    if (!city) return;
    await setCity(key, city);
    const check = await getCities();
    if (!check[key]) await setCity(key, city);
  } catch {}
}

// City per moment, read from cities.json. Keys not yet stored are backfilled
// once: the show whose date matches the capture timestamp embedded in the key
// (same day or the small hours after) is written back, so the city is derived
// a single time and saved rather than recomputed per request.
export async function resolveCities(keys: string[]): Promise<Record<string, string>> {
  const out = await getCities();
  const need = keys.filter((k) => !out[k] && capturedAt(k) != null);
  if (need.length === 0) return out;
  let derived = 0;
  try {
    const shows = await getShows();
    const days = new Map<string, string>();
    for (const s of shows) {
      const t = new Date(s.date).getTime();
      if (!Number.isFinite(t) || !s.city) continue;
      const label = s.region ? `${s.city}, ${s.region}` : s.city;
      for (const off of [0, 1]) {
        const day = new Date(t + off * 86400000).toISOString().slice(0, 10);
        if (!days.has(day)) days.set(day, label);
      }
    }
    for (const k of need) {
      const city = days.get(new Date(capturedAt(k)!).toISOString().slice(0, 10));
      if (city) {
        out[k] = city;
        derived++;
      }
    }
  } catch {}
  if (derived > 0) await putJson(CITIES_KEY, out).catch(() => {});
  return out;
}

// Leg ordering applies only when a gallery asks for a leg (the /fund pages);
// /moments shows the stored featured order as-is. The leg's stops lead in
// show-date order; cities in the leg's region follow, then every other city
// groups its moments where it first appears; cityless moments keep featured
// order at the end.
// The funding leg's city labels in show-date order.
export async function legCityOrder(legSlug?: string): Promise<string[]> {
  try {
    const slug = legSlug || (await getFundingLegSlug());
    if (!slug) return [];
    const shows = await getShows();
    const out: string[] = [];
    for (const s of shows
      .filter((s) => s.leg === slug && s.city && isShowOnTrip(s))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())) {
      const label = showLabel(s);
      if (!out.includes(label)) out.push(label);
    }
    return out;
  } catch {
    return [];
  }
}

export async function orderByFundingLeg(
  keys: string[],
  cities: Record<string, string>,
  legSlug?: string,
): Promise<string[]> {
  try {
    const rank = new Map<string, number>();
    const legLabels = await legCityOrder(legSlug);
    for (const label of legLabels) rank.set(label, rank.size);
    const regions = new Set(legLabels.map((l) => l.slice(l.lastIndexOf(", ") + 2)));
    const seed = (match: (city: string) => boolean) => {
      for (const k of keys) {
        const city = cities[k];
        if (city && !rank.has(city) && match(city)) rank.set(city, rank.size);
      }
    };
    seed((city) => regions.has(city.slice(city.lastIndexOf(", ") + 2)));
    seed(() => true);
    if (rank.size === 0) return keys;
    return keys
      .map((k, i) => ({ k, i, r: cities[k] ? rank.get(cities[k])! : Infinity }))
      .sort((a, b) => a.r - b.r || a.i - b.i)
      .map((e) => e.k);
  } catch {
    return keys;
  }
}

export async function objectExists(key: string): Promise<boolean> {
  if (!s3 || !s3Bucket) return false;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: s3Bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function createUploadUrl(
  filename: string,
  contentType?: string,
  key?: string,
) {
  const objectKey = key || `drops/${Date.now()}-${sanitizeFilename(filename)}`;
  const url = await getSignedUrl(
    s3!,
    new PutObjectCommand({
      Bucket: s3Bucket!,
      Key: objectKey,
      ContentType: contentType || "application/octet-stream",
    }),
    { expiresIn: 900 },
  );
  return { url, key: objectKey };
}

export async function getFeatured(): Promise<string[]> {
  const parsed = await getJson(FEATURED_KEY);
  return Array.isArray(parsed)
    ? parsed.filter((k): k is string => typeof k === "string")
    : [];
}

export async function setFeatured(keys: string[]): Promise<void> {
  await putJson(FEATURED_KEY, keys);
}

const OG_KEY = "og.json";

// The single moment chosen as the link-preview (OG) image, separate from the
// slideshow order. Empty/unset means surfaces fall back to their own default.
export async function getOgKey(): Promise<string | null> {
  const parsed = await getJson(OG_KEY);
  return typeof parsed === "string" && parsed.startsWith("drops/") ? parsed : null;
}

export async function setOgKey(key: string | null): Promise<void> {
  await putJson(OG_KEY, key);
}

const OG_FALLBACK = "https://peytspencer.com/og/home.jpeg";
const OG_VIDEO_EXT = /\.(mp4|mov|m4v|webm|ogg)$/i;

// Renders the chosen OG moment (or the first slideshow photo) as one resized
// JPEG Response. Backs /api/og/moments, which the fund page shows in place of
// the gallery during OG capture.
export async function renderOgMoment(): Promise<Response> {
  if (!s3 || !s3Bucket) return Response.redirect(OG_FALLBACK);

  const [ogKey, featured] = await Promise.all([getOgKey(), getFeatured()]);
  const key =
    ogKey && !OG_VIDEO_EXT.test(ogKey) ? ogKey : featured.find((k) => !OG_VIDEO_EXT.test(k));
  if (!key) return Response.redirect(OG_FALLBACK);

  for (const source of [previewKeyFor(key), key]) {
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: source }));
      const bytes = await res.Body?.transformToByteArray();
      if (!bytes) continue;

      const jpeg = await sharp(Buffer.from(bytes))
        .rotate()
        .resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();

      return new Response(new Uint8Array(jpeg), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
        },
      });
    } catch (error) {
      console.error("renderOgMoment failed for", source, error);
    }
  }
  return Response.redirect(OG_FALLBACK);
}

const DIMS_KEY = "dims.json";

export async function getDims(): Promise<Record<string, [number, number]>> {
  const parsed = await getJson(DIMS_KEY);
  return parsed && typeof parsed === "object"
    ? (parsed as Record<string, [number, number]>)
    : {};
}

export async function recordDims(entries: Record<string, [number, number]>): Promise<boolean> {
  if (!s3 || !s3Bucket) return false;
  const current = await getDims();
  let changed = false;
  for (const [key, dim] of Object.entries(entries)) {
    if (
      key.startsWith("drops/") &&
      !current[key] &&
      Array.isArray(dim) &&
      dim.length === 2 &&
      Number.isFinite(dim[0]) &&
      Number.isFinite(dim[1]) &&
      dim[0] > 0 &&
      dim[1] > 0
    ) {
      current[key] = [Math.round(dim[0]), Math.round(dim[1])];
      changed = true;
    }
  }
  if (!changed) return false;
  await putJson(DIMS_KEY, current);
  return true;
}

const u16be = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);
const u32be = (b: Uint8Array, o: number) =>
  ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;

function parseImageDims(b: Uint8Array): [number, number] | null {
  // PNG
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return [u32be(b, 16), u32be(b, 20)];
  }
  // GIF
  if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) {
    return [u16le(b, 6), u16le(b, 8)];
  }
  // WebP
  if (
    b.length >= 30 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) {
    const fmt = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (fmt === "VP8 ") return [u16le(b, 26) & 0x3fff, u16le(b, 28) & 0x3fff];
    if (fmt === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
    }
    if (fmt === "VP8X") {
      return [
        1 + (b[24] | (b[25] << 8) | (b[26] << 16)),
        1 + (b[27] | (b[28] << 8) | (b[29] << 16)),
      ];
    }
  }
  // JPEG
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    let o = 2;
    while (o + 9 < b.length) {
      if (b[o] !== 0xff) {
        o++;
        continue;
      }
      const marker = b[o + 1];
      if (marker === 0xff) {
        o++;
        continue;
      }
      if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
        o += 2;
        continue;
      }
      if (
        marker >= 0xc0 && marker <= 0xcf &&
        marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc
      ) {
        return [u16be(b, o + 7), u16be(b, o + 5)];
      }
      const len = u16be(b, o + 2);
      if (len < 2) break;
      o += 2 + len;
    }
  }
  return null;
}

export async function probeImageDims(key: string): Promise<[number, number] | null> {
  if (!s3 || !s3Bucket) return null;
  try {
    const res = await s3.send(
      new GetObjectCommand({ Bucket: s3Bucket, Key: key, Range: "bytes=0-262143" }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) return null;
    // Sharp reads EXIF orientation; the byte parser reports stored dimensions,
    // which are swapped for rotated portrait shots.
    try {
      const meta = await sharp(bytes).metadata();
      if (meta.width && meta.height) {
        return (meta.orientation ?? 1) >= 5 ? [meta.height, meta.width] : [meta.width, meta.height];
      }
    } catch {}
    return parseImageDims(bytes);
  } catch {
    return null;
  }
}

const THUMBS_KEY = "thumbs.json";
export const THUMB_WIDTHS = [480, 960, 1440];
const THUMB_QUALITY = 60;

export type ThumbSize = { w: number; h: number; key: string };
export type ThumbEntry = { key: string; w: number; h: number; sizes: ThumbSize[] };

export function thumbKeyFor(originalKey: string, width?: number): string {
  const base = originalKey.replace(/^drops\//, "").replace(/\.[^./]+$/, "");
  return width ? `thumbs/${base}-${width}w.avif` : `thumbs/${base}.avif`;
}

export async function getThumbs(): Promise<Record<string, ThumbEntry>> {
  const parsed = await getJson(THUMBS_KEY);
  return parsed && typeof parsed === "object" ? (parsed as Record<string, ThumbEntry>) : {};
}

export async function recordThumbs(entries: Record<string, ThumbEntry>): Promise<void> {
  if (!s3 || !s3Bucket || Object.keys(entries).length === 0) return;
  const current = await getThumbs();
  for (const [key, entry] of Object.entries(entries)) current[key] = entry;
  await putJson(THUMBS_KEY, current);
}

export async function makeThumbSizes(
  input: Uint8Array,
): Promise<Array<{ target: number; data: Buffer; w: number; h: number }>> {
  const out: Array<{ target: number; data: Buffer; w: number; h: number }> = [];
  let cappedAt: number | null = null;
  for (const target of THUMB_WIDTHS) {
    if (cappedAt !== null && target > cappedAt) break;
    const rendered = await sharp(input)
      .rotate()
      .resize({ width: target, withoutEnlargement: true })
      .avif({ quality: THUMB_QUALITY })
      .toBuffer({ resolveWithObject: true });
    out.push({ target, data: rendered.data, w: rendered.info.width, h: rendered.info.height });
    if (rendered.info.width < target) cappedAt = rendered.info.width;
  }
  return out;
}

export async function generateThumb(originalKey: string): Promise<ThumbEntry | null> {
  if (!s3 || !s3Bucket) return null;
  const sources = OG_VIDEO_EXT.test(originalKey)
    ? [previewKeyFor(originalKey)]
    : [previewKeyFor(originalKey), originalKey];
  for (const source of sources) {
    try {
      const res = await s3.send(new GetObjectCommand({ Bucket: s3Bucket, Key: source }));
      const bytes = await res.Body?.transformToByteArray();
      if (!bytes) continue;
      const renders = await makeThumbSizes(bytes);
      if (!renders.length) continue;
      const sizes: ThumbSize[] = [];
      for (const r of renders) {
        const key = thumbKeyFor(originalKey, r.target);
        await s3.send(
          new PutObjectCommand({
            Bucket: s3Bucket,
            Key: key,
            Body: r.data,
            ContentType: "image/avif",
            CacheControl: "public, max-age=31536000, immutable",
          }),
        );
        sizes.push({ key, w: r.w, h: r.h });
      }
      const largest = sizes[sizes.length - 1];
      return { key: largest.key, w: largest.w, h: largest.h, sizes };
    } catch {}
  }
  return null;
}

export async function deleteMomentArtifacts(originalKey: string): Promise<void> {
  if (!s3 || !s3Bucket) return;
  const [thumbs, dims] = await Promise.all([getThumbs(), getDims()]);
  const entry = thumbs[originalKey];
  const thumbObjects = entry?.sizes?.length
    ? entry.sizes.map((s) => s.key)
    : [entry?.key ?? thumbKeyFor(originalKey)];
  await Promise.all([
    s3.send(
      new DeleteObjectCommand({ Bucket: s3Bucket, Key: previewKeyFor(originalKey) }),
    ),
    ...thumbObjects.map((key) =>
      s3!.send(new DeleteObjectCommand({ Bucket: s3Bucket!, Key: key })).catch(() => {}),
    ),
  ]);
  const writes: Promise<void>[] = [];
  if (thumbs[originalKey]) {
    delete thumbs[originalKey];
    writes.push(putJson(THUMBS_KEY, thumbs));
  }
  if (dims[originalKey]) {
    delete dims[originalKey];
    writes.push(putJson(DIMS_KEY, dims));
  }
  await Promise.all(writes);
}

export async function renameMomentArtifacts(oldKey: string, newKey: string): Promise<void> {
  if (!s3 || !s3Bucket) return;
  try {
    await s3.send(
      new CopyObjectCommand({
        Bucket: s3Bucket,
        CopySource: `${s3Bucket}/${previewKeyFor(oldKey)}`,
        Key: previewKeyFor(newKey),
      }),
    );
    await s3.send(
      new DeleteObjectCommand({ Bucket: s3Bucket, Key: previewKeyFor(oldKey) }),
    );
  } catch {}
  const [thumbs, dims] = await Promise.all([getThumbs(), getDims()]);
  const writes: Promise<void>[] = [];
  if (thumbs[oldKey]) {
    thumbs[newKey] = thumbs[oldKey];
    delete thumbs[oldKey];
    writes.push(putJson(THUMBS_KEY, thumbs));
  }
  if (dims[oldKey]) {
    dims[newKey] = dims[oldKey];
    delete dims[oldKey];
    writes.push(putJson(DIMS_KEY, dims));
  }
  await Promise.all(writes);
}

const VIEW_TTL = 21600;
const IMAGE_EXT = /\.(jpe?g|png|webp|gif)$/i;
const THUMB_BATCH = 8;

const MEDIA_BASE = process.env.MOMENTS_MEDIA_BASE?.replace(/\/+$/, "");

function signView(key: string) {
  return getSignedUrl(s3!, new GetObjectCommand({ Bucket: s3Bucket!, Key: key }), {
    expiresIn: VIEW_TTL,
  });
}

type CoreItem = {
  key: string;
  thumbKey?: string;
  thumbSizes?: ThumbSize[];
  previewKey?: string;
  city?: string;
  w?: number;
  h?: number;
};

const getCore = unstable_cache(
  async (leg: string | undefined): Promise<CoreItem[]> => {
    const featured = await getFeatured();
    const [dims, thumbs, previewList, cities] = await Promise.all([
      getDims(),
      getThumbs(),
      s3!.send(
        new ListObjectsV2Command({ Bucket: s3Bucket!, Prefix: "previews/", MaxKeys: 1000 }),
      ),
      resolveCities(featured),
    ]);
    const keys = leg ? await orderByFundingLeg(featured, cities, leg) : featured;
    const previewKeys = new Set(
      (previewList.Contents || [])
        .map((o) => o.Key || "")
        .filter((k) => k && k !== "previews/"),
    );

    const missingDims = keys.filter((k) => !dims[k] && IMAGE_EXT.test(k));
    if (missingDims.length) {
      const found: Record<string, [number, number]> = {};
      await Promise.all(
        missingDims.map(async (key) => {
          const d = await probeImageDims(key);
          if (d) {
            dims[key] = d;
            found[key] = d;
          }
        }),
      );
      if (Object.keys(found).length) await recordDims(found);
    }

    const missingThumbs = keys.filter((k) => !thumbs[k]).slice(0, THUMB_BATCH);
    if (missingThumbs.length) {
      const found: Record<string, ThumbEntry> = {};
      await Promise.all(
        missingThumbs.map(async (key) => {
          const t = await generateThumb(key);
          if (t) {
            thumbs[key] = t;
            found[key] = t;
          }
        }),
      );
      if (Object.keys(found).length) await recordThumbs(found);
    }

    return keys.map((key) => {
      const t = thumbs[key];
      const d = dims[key];
      const preview = previewKeys.has(previewKeyFor(key)) ? previewKeyFor(key) : undefined;
      const wh = t ? { w: t.w, h: t.h } : Array.isArray(d) ? { w: d[0], h: d[1] } : {};
      return {
        key,
        ...(t ? { thumbKey: t.key, thumbSizes: t.sizes } : {}),
        ...(preview ? { previewKey: preview } : {}),
        ...(cities[key] ? { city: cities[key] } : {}),
        ...wh,
      };
    });
  },
  ["moments-featured-core"],
  { tags: ["moments-featured"], revalidate: 86400 },
);

export type GalleryItem = {
  key: string;
  src?: string;
  srcSet?: string;
  city?: string;
  w?: number;
  h?: number;
};

export async function getFeaturedGalleryItems(leg?: string): Promise<GalleryItem[]> {
  if (!s3 || !s3Bucket) return [];

  const core = await getCore(leg);

  return Promise.all(
    core.map(async (c) => {
      const thumb = c.thumbKey
        ? MEDIA_BASE
          ? `${MEDIA_BASE}/${c.thumbKey}`
          : await signView(c.thumbKey)
        : c.previewKey
          ? await signView(c.previewKey)
          : undefined;
      const srcSet = c.thumbSizes?.length
        ? (
            await Promise.all(
              c.thumbSizes.map(async (s) => {
                const url = MEDIA_BASE ? `${MEDIA_BASE}/${s.key}` : await signView(s.key);
                return `${url} ${s.w}w`;
              }),
            )
          ).join(", ")
        : undefined;
      return {
        key: c.key,
        ...(thumb ? { src: thumb } : {}),
        ...(srcSet ? { srcSet } : {}),
        ...(c.city ? { city: c.city } : {}),
        ...(c.w && c.h ? { w: c.w, h: c.h } : {}),
      };
    }),
  );
}
