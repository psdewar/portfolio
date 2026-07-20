// Venue logo source can be a /public filename (tcc.webp), an absolute image
// URL, or a Wikimedia Commons "File:" page URL. normalizeVenueImg rewrites the
// Commons page link to Special:FilePath, which redirects to the real upload, so
// pasting the page URL works directly. Other inputs pass through untouched.

const COMMONS_FILE_PAGE =
  /^https?:\/\/[a-z0-9.-]*wiki(?:m|p)edia\.org\/wiki\/(?:File|Image):(.+)$/i;

export function normalizeVenueImg(input: string): string {
  const p = input.trim();
  if (!p) return "";
  const m = p.match(COMMONS_FILE_PAGE);
  if (m) return `https://commons.wikimedia.org/wiki/Special:FilePath/${m[1]}`;
  return p;
}

export function isAbsoluteImg(p: string): boolean {
  return /^(https?:\/\/|data:)/i.test(p);
}

// Browser-side src for a venue logo or custom poster: absolute URLs and data
// URLs pass through, a bare /public filename gets its leading slash.
export function resolveImgSrc(input: string): string {
  const p = normalizeVenueImg(input);
  if (!p) return "";
  return isAbsoluteImg(p) || p.startsWith("/") ? p : `/${p}`;
}

// Hosts the server is allowed to fetch a venue logo from. The poster/pamphlet
// routes fetch this URL server-side, so an open fetch would be an SSRF vector
// (cloud metadata, localhost, RFC1918). Keep this list tight; add a host here to
// support a new image source.
export const ALLOWED_VENUE_IMG_HOSTS = new Set([
  "commons.wikimedia.org",
  "upload.wikimedia.org",
]);

// Parse and validate a remote venue-image URL: https only, exact host match
// against the allowlist. Returns the URL, or null if it must not be fetched.
export function allowedVenueImgUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!ALLOWED_VENUE_IMG_HOSTS.has(url.hostname)) return null;
  return url;
}
