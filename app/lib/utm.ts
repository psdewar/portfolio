export const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
export type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

const STORAGE_KEY = "utm";
const MAX_LEN = 200;

export function readUtmFrom(params: URLSearchParams): Utm {
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key)?.trim().slice(0, MAX_LEN);
    if (value) utm[key] = value;
  }
  return utm;
}

// Landing URL wins over what's stored, so a new campaign link replaces an old one.
export function captureUtm(): Utm {
  try {
    const fresh = readUtmFrom(new URLSearchParams(window.location.search));
    if (Object.keys(fresh).length) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      return fresh;
    }
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}") as Utm;
  } catch {
    return readUtmFrom(new URLSearchParams(window.location.search));
  }
}

// Server-side: keep only known keys, strings, bounded length.
export function sanitizeUtm(input: unknown): Utm {
  const utm: Utm = {};
  if (!input || typeof input !== "object") return utm;
  for (const key of UTM_KEYS) {
    const value = (input as Record<string, unknown>)[key];
    if (typeof value === "string" && value.trim()) utm[key] = value.trim().slice(0, MAX_LEN);
  }
  return utm;
}
